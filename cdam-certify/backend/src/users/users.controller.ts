import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService, SafeUser } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Roles(UserRole.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<SafeUser[]> {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create(dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<SafeUser> {
    return this.usersService.setActive(id, false);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string): Promise<SafeUser> {
    return this.usersService.setActive(id, true);
  }
}
