import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map(this.omitPassword);
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, fullName: dto.fullName, role: dto.role, passwordHash },
    });
    return this.omitPassword(user);
  }

  async setActive(id: string, isActive: boolean): Promise<SafeUser> {
    const user = await this.prisma.user.update({ where: { id }, data: { isActive } });
    return this.omitPassword(user);
  }

  private omitPassword(user: User): SafeUser {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
