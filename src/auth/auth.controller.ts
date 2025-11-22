import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDocenteDto } from './dto/login-docente.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login/docente')
  @HttpCode(HttpStatus.OK)
  async loginDocente(@Body() loginDocenteDto: LoginDocenteDto) {
    return this.authService.loginDocente(loginDocenteDto);
  }

  @Public()
  @Post('login/admin')
  @HttpCode(HttpStatus.OK)
  async loginAdmin(@Body() loginAdminDto: LoginAdminDto) {
    return this.authService.loginAdmin(loginAdminDto);
  }
}