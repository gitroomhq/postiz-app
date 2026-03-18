import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
export const loadSwagger = (app) => {
    const config = new DocumentBuilder()
        .setTitle('Postiz Swagger file')
        .setDescription('API description')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
};
//# sourceMappingURL=load.swagger.js.map