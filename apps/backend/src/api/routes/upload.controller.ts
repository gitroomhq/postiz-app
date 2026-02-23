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
import { extname } from 'path';
import { diskStorage } from 'multer';

// Type definition for S3 file upload
interface S3File extends Express.Multer.File {
	location: string;
	key: string;
	bucket: string;
	etag: string;
}

function createStorage() {
	const provider = process.env.STORAGE_PROVIDER || 'local';

	if (provider === 'local') {
		const uploadDir = process.env.UPLOAD_DIRECTORY || './uploads';
		return diskStorage({
			destination: uploadDir,
			filename: (req, file, cb) => {
				const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
				const extension = extname(file.originalname);
				cb(null, `${uniqueSuffix}${extension}`);
			},
		});
	}

	// S3 storage - only initialize when actually needed
	const { S3Client } = require('@aws-sdk/client-s3');
	const multerS3 = require('multer-s3');

	const s3 = new S3Client({
		region: process.env.AWS_REGION,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
		},
	});

	return multerS3({
		s3: s3,
		bucket: process.env.AWS_BUCKET_NAME,
		contentType: multerS3.AUTO_CONTENT_TYPE,
		metadata: (req: any, file: any, cb: any) => {
			cb(null, { fieldName: file.fieldname });
		},
		key: (req: any, file: any, cb: any) => {
			const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
			const extension = extname(file.originalname);
			const filename = `${uniqueSuffix}${extension}`;
			const fullPath = `${process.env.AWS_BUCKET_DIR}/${filename}`;
			cb(null, fullPath);
		},
	});
}

const storage = createStorage();

@ApiTags('File Upload')
@Controller('upload')
export class UploadController {
	private readonly logger = new Logger(UploadController.name);

	@Post()
	@UseInterceptors(
		FileInterceptor('file', {
			storage,
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

		// For local storage, construct the URL from the filename
		const url = file.location || `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/uploads/${file.filename}`;

		return {
			url,
			key: file.key || file.filename,
			mimetype: file.mimetype,
			size: file.size,
		};
	}
}
