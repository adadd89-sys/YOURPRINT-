CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL,
  "contactsTitle" TEXT NOT NULL DEFAULT 'Контакты',
  "contactsIntro" TEXT NOT NULL DEFAULT 'Свяжитесь с нами — поможем с заказом и ответим на вопросы.',
  "phone" TEXT NOT NULL DEFAULT '',
  "telegram" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "workingHours" TEXT NOT NULL DEFAULT '',
  "instagram" TEXT NOT NULL DEFAULT '',
  "vk" TEXT NOT NULL DEFAULT '',
  "website" TEXT NOT NULL DEFAULT '',
  "extraInfo" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
