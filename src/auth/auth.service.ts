import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDocenteDto } from './dto/login-docente.dto';
import { LoginAdminDto } from './dto/login-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

 async loginDocente(loginDocenteDto: LoginDocenteDto) {
  const { numeroCedula } = loginDocenteDto;
  console.log('🔍 Buscando usuario con numeroCedula:', numeroCedula);
  const user = await this.usersService.findByNumeroCedula(numeroCedula);
  console.log('📋 Usuario encontrado:', user ? { id: (user as any)._id, numeroCedula: user.numeroCedula, activo: user.activo, role: user.role } : 'null');
  if (!user) {
    throw new UnauthorizedException('Cédula no registrada');
  }
  if (user.role !== 'docente') {
    throw new UnauthorizedException('Este usuario no es un docente');
  }
  const payload = {
    sub: (user as any)._id.toString(),
    cedula: user.numeroCedula,
    nombre: user.nombre,
    email: user.email,
    role: user.role,
  };
  return {
    access_token: this.jwtService.sign(payload),
    user: {
      id: (user as any)._id.toString(),
      cedula: user.numeroCedula,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      departamento: user.departamento,
    },
  };
}
  async loginAdmin(loginAdminDto: LoginAdminDto) {
    const { username, password } = loginAdminDto;
    console.log('🔍 [ADMIN] Buscando admin con username:', username);
    const user = await this.usersService.findByUsername(username);
    console.log('📋 [ADMIN] Usuario encontrado:', user ? { id: (user as any)._id, username: user.username, role: user.role, activo: user.activo } : 'null');

    if (!user) {
      console.log('❌ [ADMIN] Usuario no encontrado en la BD');
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (user.role !== 'administrador') {
      console.log('⚠️ [ADMIN] Usuario encontrado pero role incorrecto:', user.role);
      throw new UnauthorizedException('Este usuario no es un administrador');
    }

    console.log('🔐 [ADMIN] Validando contraseña...');
    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
    );
    console.log('✅ [ADMIN] Contraseña válida:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ [ADMIN] Contraseña incorrecta');
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const payload = {
      sub: (user as any)._id.toString(),
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: (user as any)._id.toString(),
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
      },
    };
  }
}