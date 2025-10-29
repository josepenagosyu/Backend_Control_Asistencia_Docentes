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
    const { cedula } = loginDocenteDto;

    const user = await this.usersService.findByCedula(cedula);

    if (!user) {
      throw new UnauthorizedException('Cédula no registrada');
    }

    if (user.rol !== 'docente') {
      throw new UnauthorizedException('Este usuario no es un docente');
    }

    const payload = {
      sub: (user as any)._id.toString(),
      cedula: user.cedula,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: (user as any)._id.toString(),
        cedula: user.cedula,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento,
      },
    };
  }

  async loginAdmin(loginAdminDto: LoginAdminDto) {
    const { username, password } = loginAdminDto;

    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (user.rol !== 'administrador') {
      throw new UnauthorizedException('Este usuario no es un administrador');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const payload = {
      sub: (user as any)._id.toString(),
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: (user as any)._id.toString(),
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    };
  }
}