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
    // Si es administrador y tiene contraseña, encriptarla
    if (createUserDto.rol === 'administrador' && createUserDto.password) {
      const saltRounds = 10;
      createUserDto.password = await bcrypt.hash(createUserDto.password, saltRounds);
    }

    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findByCedula(cedula: string): Promise<User | null> {
    return this.userModel.findOne({ cedula, activo: true }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username, activo: true }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // ✅ NUEVO: Sincronizar desde archivo fijo en la carpeta uploads
  async sincronizarDocentes() {
    try {
      const rutaArchivo = path.join(process.cwd(), 'uploads', 'docentes.xlsx');

      // Verificar si el archivo existe
      if (!fs.existsSync(rutaArchivo)) {
        throw new BadRequestException(
          'El archivo docentes.xlsx no existe en la carpeta uploads. Por favor, crea la carpeta "uploads" en el backend y coloca el archivo.',
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

  // ✅ NUEVO: Importar docentes desde Excel (VERSIÓN CORREGIDA CON TIPOS)
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
            cedula: fila.cedula,
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
              cedula: fila.cedula,
              nombre: fila.nombre,
              email: fila.email,
              telefono: fila.telefono || '',
              departamento: fila.departamento || '',
              tituloAcademico: fila.tituloAcademico || '',
              rol: 'docente',
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