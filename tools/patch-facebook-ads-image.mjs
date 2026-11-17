import fs from 'fs';

function patch(path, transform) {
  if (!fs.existsSync(path)) {
    console.warn('skip missing', path);
    return;
  }
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after);
}

patch('/app/apps/backend/src/api/api.module.ts', (src) => {
  if (src.includes('FacebookAdsController')) return src;
  if (!src.includes("facebook-ads.controller")) {
    src = src.replace(
      "from '@gitroom/backend/api/routes/admin.controller';",
      "from '@gitroom/backend/api/routes/admin.controller';\nimport { FacebookAdsController } from '@gitroom/backend/api/routes/facebook-ads.controller';"
    );
  }
  if (!src.includes('FacebookAdsController,')) {
    src = src.replace('AdminController,', 'AdminController,\n  FacebookAdsController,');
  }
  return src;
});

patch('/app/libraries/nestjs-libraries/src/database/prisma/database.module.ts', (src) => {
  if (src.includes('FacebookAdsService')) return src;
  src = src.replace(
    "from '@gitroom/nestjs-libraries/database/prisma/admin-stats/admin-stats.service';",
    "from '@gitroom/nestjs-libraries/database/prisma/admin-stats/admin-stats.service';\nimport { FacebookAdsService } from '@gitroom/nestjs-libraries/database/prisma/facebook-ads/facebook.ads.service';\nimport { FacebookAdsClient } from '@gitroom/nestjs-libraries/integrations/facebook-ads/facebook.ads.client';"
  );
  src = src.replace('AdminStatsService,', 'AdminStatsService,\n    FacebookAdsClient,\n    FacebookAdsService,');
  return src;
});

patch('/app/libraries/nestjs-libraries/src/database/prisma/schema.prisma', (src) => {
  if (src.includes('model FacebookAdsConnection')) return src;
  if (!src.includes('facebookAdsConnections')) {
    src = src.replace(
      '  Integration         Integration[]',
      '  Integration         Integration[]\n  facebookAdsConnections FacebookAdsConnection[]'
    );
  }
  return src + `

model FacebookAdsConnection {
  id                   String       @id @default(cuid())
  organizationId       String
  facebookUserId       String
  name                 String
  accessToken          String
  tokenExpiration      DateTime?
  selectedBusinessId   String?
  selectedAdAccountId  String?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  organization         Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId])
  @@index([organizationId])
  @@index([facebookUserId])
}
`;
});

patch('/app/apps/frontend/src/components/layout/top.menu.tsx', (src) => {
  if (src.includes("path: '/facebook-ads'")) return src;
  const item = "\n    {\n      name: 'Facebook Ads',\n      icon: <span aria-hidden=\"true\">f</span>,\n      path: '/facebook-ads',\n    },";
  if (src.includes("path: '/civic-desk'")) {
    return src.replace(
      "path: '/civic-desk',\n    },",
      "path: '/civic-desk',\n    }," + item
    );
  }
  return src.replace(
    "path: '/agents',\n    },",
    "path: '/agents',\n    }," + item
  );
});

console.log('facebook-ads docker patches applied');
