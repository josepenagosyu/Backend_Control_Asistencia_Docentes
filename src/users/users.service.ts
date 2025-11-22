import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    console.log('📝 [CREATE USER] Creando usuario con datos:', {
      username: createUserDto.username,
      role: createUserDto.role,
      nombre: createUserDto.nombre,
      email: createUserDto.email
    });
    
    // Si es administrador y no tiene numeroCedula, asignarle uno único basado en username
    if (createUserDto.role === 'administrador' && !createUserDto.numeroCedula) {
      // Crear un numeroCedula único para admin usando un prefijo + timestamp + hash del username
      const timestamp = Date.now();
      const usernameHash = createUserDto.username ? 
        createUserDto.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10000 : 0;
      createUserDto.numeroCedula = `ADMIN-${timestamp}-${usernameHash}`;
      console.log('🔢 [CREATE USER] NumeroCedula generado para admin:', createUserDto.numeroCedula);
    }
    
    // Si es administrador y tiene contraseña, encriptarla
    if (createUserDto.role === 'administrador' && createUserDto.password) {
      const saltRounds = 10;
      createUserDto.password = await bcrypt.hash(createUserDto.password, saltRounds);
      console.log('🔐 [CREATE USER] Contraseña hasheada correctamente');
    }

    console.log('💾 [CREATE USER] Guardando en colección: docentes');
    const createdUser = new this.userModel(createUserDto);
    const savedUser = await createdUser.save();
    console.log('✅ [CREATE USER] Usuario creado exitosamente:', {
      id: (savedUser as any)._id,
      username: savedUser.username,
      role: savedUser.role,
      activo: savedUser.activo,
      numeroCedula: savedUser.numeroCedula
    });
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findByNumeroCedula(numeroCedula: string): Promise<User | null> {
    console.log('🔎 Buscando en BD con query:', { numeroCedula });
    // Buscar primero sin filtro de activo para ver qué encontramos
    const user = await this.userModel.findOne({ numeroCedula }).exec();
    console.log('📊 Usuario encontrado:', user ? 'Sí' : 'No');
    if (user) {
      console.log('📋 Datos del usuario:', {
        numeroCedula: user.numeroCedula,
        activo: user.activo,
        tipoActivo: typeof user.activo,
        role: user.role
      });
      // Verificar si está activo (puede ser boolean true, string "true", o no definido)
      // Usar type assertion para permitir verificación flexible del tipo
      const activoValue = user.activo as any;
      // Si es null, undefined, false, 0, "false", o string vacío, considerar inactivo
      // Si es true, 1, "true", o cualquier otro valor truthy, considerar activo
      const isActivo = activoValue !== null && 
                       activoValue !== undefined && 
                       activoValue !== false && 
                       activoValue !== 0 && 
                       activoValue !== 'false' && 
                       activoValue !== '';
      if (!isActivo) {
        console.log('⚠️ Usuario existe pero está inactivo');
        return null; // Usuario inactivo, no permitir login
      }
      console.log('✅ Usuario activo, permitiendo acceso');
      return user;
    } else {
      console.log('❌ Usuario no existe en la base de datos');
      return null;
    }
  }
  async findByUsername(username: string): Promise<User | null> {
    console.log('🔎 [USERS SERVICE] Buscando en BD con query:', { username, activo: true });
    console.log('📊 [USERS SERVICE] Colección utilizada: docentes');
    const user = await this.userModel.findOne({ username, activo: true }).exec();
    console.log('📋 [USERS SERVICE] Resultado:', user ? `Usuario encontrado (ID: ${(user as any)._id})` : 'Usuario NO encontrado');
    return user;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  //  NUEVO: Sincronizar desde archivo fijo en la carpeta uploads
  async sincronizarDocentes() {
    try {
      const rutaArchivo = path.join(process.cwd(), 'uploads', 'docentes.xlsx');

      // Verificar si el archivo existe
      if (!fs.existsSync(rutaArchivo)) {
        throw new BadRequestException(
          'El archivo docentes.xlsx no existe en la carpeta uploads',
        );
      }

      // Leer el archivo
      const buffer = fs.readFileSync(rutaArchivo);

      // Procesar con el método existente
      return await this.importarDesdeExcel(buffer);
    } catch (error) {
      throw new BadRequestException(
        `Error sincronizando: ${(error as any).message}`,
      );
    }
  }

  //   Importar docentes desde Excel 
  async importarDesdeExcel(buffer: Buffer) {
    try {
      // Leer el archivo Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const datos: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!datos || datos.length === 0) {
        throw new BadRequestException('El archivo está vacío');
      }

      const resultados = {
        creados: 0,
        actualizados: 0,
        errores: [] as Array<{ fila: number; mensaje: string }>,
      };

      // Procesar cada fila del Excel
      for (let i = 0; i < datos.length; i++) {
        const fila = datos[i] as any;

        try {
          // Validar campos requeridos
          if (!fila.cedula || !fila.nombre || !fila.email) {
            resultados.errores.push({
              fila: i + 2, // +2 porque fila 1 es encabezado
              mensaje: 'Faltan campos requeridos (cedula, nombre, email)',
            });
            continue;
          }

          // Buscar si el docente ya existe
          const usuarioExistente = await this.userModel.findOne({
            numeroCedula: fila.cedula,
          });

          if (usuarioExistente) {
            // Actualizar datos existentes
            await this.userModel.findByIdAndUpdate(
              usuarioExistente._id,
              {
                nombre: fila.nombre,
                email: fila.email,
                telefono: fila.telefono || '',
                departamento: fila.departamento || '',
                tituloAcademico: fila.tituloAcademico || '',
              },
            );
            resultados.actualizados++;
          } else {
            // Crear nuevo docente
            const nuevoUsuario = new this.userModel({
              numeroCedula: fila.cedula,
              nombre: fila.nombre,
              email: fila.email,
              telefono: fila.telefono || '',
              departamento: fila.departamento || '',
              tituloAcademico: fila.tituloAcademico || '',
              role: 'docente',
              activo: true,
            });

            await nuevoUsuario.save();
            resultados.creados++;
          }
        } catch (error) {
          resultados.errores.push({
            fila: i + 2,
            mensaje: (error as any).message,
          });
        }
      }

      return resultados;
    } catch (error) {
      throw new BadRequestException(
        `Error procesando archivo: ${(error as any).message}`,
      );
    }
  }
}