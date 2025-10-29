import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

 import {
 
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // ... tus otros métodos ...

  // ✅ NUEVO ENDPOINT: Importar Excel
  @Post('importar-docentes')
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
  @Post('sincronizar-docentes')
async sincronizarDocentes() {
  return this.usersService.sincronizarDocentes();
 }
}

