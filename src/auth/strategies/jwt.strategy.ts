import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Acceso a _id: Mongoose Document siempre tiene _id
    // Usamos type assertion para evitar error de TypeScript estricto
    const userId = (user as any)._id?.toString() || (user as any).id?.toString();

    return {
      id: userId || payload.sub, // Fallback al sub del payload si no hay _id
      cedula: user.numeroCedula,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      departamento: user.departamento,
    };
  }
}
