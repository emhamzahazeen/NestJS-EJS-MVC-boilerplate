import { Body, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiV1Controller, JwtAuthGuard } from '@shared';
import { Request } from 'express';

@ApiV1Controller('users')
export class ApiUserController {
    @UseGuards(JwtAuthGuard)
    @Get('viewer')
    profile(@Req() req: Request) {
        return req.user;
    }
}