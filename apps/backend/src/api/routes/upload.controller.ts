import {
	Controller,
	Post,
	UploadedFile,
	UseInterceptors,
	BadRequestException,
	Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { extname } from 'path';

// Type definition for S3 file upload
interface S3File extends Express.Multer.File {
	location: string;
	key: string;
	bucket: string;
	etag: string;
}

// Configure AWS SDK v3
const s3 = new S3Client({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

// Configure Multer-S3 storage
const s3Storage = multerS3({
	s3: s3,
	bucket: process.env.AWS_BUCKET_NAME,
	contentType: multerS3.AUTO_CONTENT_TYPE,
	metadata: (req, file, cb) => {
		cb(null, { fieldName: file.fieldname });
	},
	key: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const extension = extname(file.originalname);
		const filename = `${uniqueSuffix}${extension}`;
		const fullPath = `${process.env.AWS_BUCKET_DIR}/${filename}`;
		cb(null, fullPath);
	},
});

@ApiTags('File Upload')
@Controller('upload')
export class UploadController {
	private readonly logger = new Logger(UploadController.name);

	@Post()
	@UseInterceptors(
		FileInterceptor('file', {
			storage: s3Storage,
			limits: {
				fileSize: 10 * 1024 * 1024, // 10MB limit
			},
			fileFilter: (req, file, cb) => {
				if (
					file.mimetype.match(
						/\/(jpg|jpeg|png|gif|pdf|doc|docx|txt|mp4|mov|avi)$/,
					)
				) {
					cb(null, true);
				} else {
					cb(
						new BadRequestException(
							`Unsupported file type ${extname(file.originalname)}`,
						),
						false,
					);
				}
			},
		}),
	)
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		description: 'File upload',
		schema: {
			type: 'object',
			properties: {
				file: {
					type: 'string',
					format: 'binary',
				},
			},
		},
	})
	@ApiResponse({
		status: 201,
		description: 'File uploaded successfully',
		schema: {
			type: 'object',
			properties: {
				url: { type: 'string', example: 'https://your-bucket.s3.amazonaws.com/uploads/file.jpg' },
				key: { type: 'string', example: 'uploads/file.jpg' },
				mimetype: { type: 'string', example: 'image/jpeg' },
				size: { type: 'number', example: 12345 },
			},
		},
	})
	@ApiResponse({ status: 400, description: 'Invalid file type or size' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	async uploadFile(@UploadedFile() file: S3File) {
		if (!file) {
			throw new BadRequestException('File upload failed');
		}

		this.logger.log(`File uploaded successfully: ${file.originalname}`);

		return {
			url: file.location,
			key: file.key,
			mimetype: file.mimetype,
			size: file.size,
		};
	}
}