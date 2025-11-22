import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard) // Todas las rutas requieren autenticación
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('administrador', 'docente')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('administrador')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // ✅ ENDPOINT: Importar Excel - Solo administradores
  @Post('importar-docentes')
  @UseGuards(RolesGuard)
  @Roles('administrador')
  @UseInterceptors(FileInterceptor('archivo'))
  async importarDocentes(@UploadedFile() archivo) {
    if (!archivo) {
      throw new BadRequestException('No se subió archivo');
    }

    // Validar que sea Excel
    if (
      ![
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ].includes(archivo.mimetype)
    ) {
      throw new BadRequestException('Solo se aceptan archivos Excel (.xlsx o .xls)');
    }

    return this.usersService.importarDesdeExcel(archivo.buffer);
  }

  // ✅ ENDPOINT: Sincronizar docentes desde archivo fijo - Solo administradores
  @Post('sincronizar-docentes')
  @UseGuards(RolesGuard)
  @Roles('administrador')
  async sincronizarDocentes() {
    return this.usersService.sincronizarDocentes();
  }

  // ⚠️ TEMPORAL: Endpoint para crear el primer administrador
  // Solo para desarrollo inicial - Protegido pero sin validación de roles
  // RECOMENDACIÓN: Eliminar este endpoint en producción o protegerlo mejor
  @Post('crear-admin-inicial')
  @UseGuards(RolesGuard)
  @Roles('administrador') // Protegido: solo administradores pueden crear otros admins
  async crearAdminInicial(@Body() createUserDto: CreateUserDto) {
    console.log('🚀 [CREAR ADMIN] Petición recibida:', {
      username: createUserDto.username,
      role: createUserDto.role,
      nombre: createUserDto.nombre,
      email: createUserDto.email
    });
    
    // Validar que sea administrador
    if (createUserDto.role !== 'administrador') {
      console.log('❌ [CREAR ADMIN] Role incorrecto:', createUserDto.role);
      throw new BadRequestException('Este endpoint solo crea administradores');
    }
    
    // Validar campos requeridos
    if (!createUserDto.username || !createUserDto.password || !createUserDto.nombre || !createUserDto.email) {
      console.log('❌ [CREAR ADMIN] Faltan campos requeridos');
      throw new BadRequestException('Faltan campos requeridos: username, password, nombre, email');
    }

    console.log('✅ [CREAR ADMIN] Validaciones pasadas, creando usuario...');
    return this.usersService.create(createUserDto);
  }
}

