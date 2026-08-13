-- AlterTable
ALTER TABLE "rider_applications" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;
