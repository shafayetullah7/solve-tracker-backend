import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOkResponse({
    description: 'Scaffold greeting',
    content: {
      'text/plain': { schema: { type: 'string' } },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
