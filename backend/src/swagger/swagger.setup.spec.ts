import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger.setup';

jest.mock('@nestjs/swagger', () => {
  const actual = jest.requireActual('@nestjs/swagger');

  return {
    ...actual,
    SwaggerModule: {
      ...actual.SwaggerModule,
      createDocument: jest.fn().mockReturnValue({ openapi: '3.0.0' }),
      setup: jest.fn(),
    },
  };
});

describe('setupSwagger', () => {
  const app = {} as INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register Swagger routes when disabled', () => {
    setupSwagger(app, false);

    expect(SwaggerModule.createDocument).not.toHaveBeenCalled();
    expect(SwaggerModule.setup).not.toHaveBeenCalled();
  });

  it('registers the UI and JSON routes when enabled', () => {
    setupSwagger(app, true);

    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        info: expect.objectContaining({
          title: 'ShoppingWeb Backend API',
          version: '1.0',
        }),
        components: expect.objectContaining({
          securitySchemes: expect.objectContaining({
            access_token: expect.any(Object),
            refresh_token: expect.any(Object),
          }),
        }),
      }),
    );
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'docs',
      app,
      { openapi: '3.0.0' },
      { jsonDocumentUrl: 'docs-json' },
    );
  });
});
