import { z } from 'zod';

import { isCampus } from '@/constants/campuses';
import { limits, priceFractionDigits } from '@/constants/theme';

const subscriber = limits.phoneSubscriberDigits;
const localPhone = new RegExp(`^0\\d{${subscriber}}$`);
const internationalPhone = new RegExp(`^\\+233\\d{${subscriber}}$`);
const otpCode = new RegExp(`^\\d{${limits.otpMin},${limits.otpMax}}$`);

export const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.');

export const passwordSchema = z.string().refine(
  (value) =>
    value.length >= limits.passwordMin && /[A-Za-z]/.test(value) && /\d/.test(value),
  `Use at least ${limits.passwordMin} characters, with a letter and a number.`,
);

export const fullNameSchema = z
  .string()
  .trim()
  .min(limits.nameMin, 'Enter your name.')
  .max(limits.nameMax, `Use at most ${limits.nameMax} characters.`);

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ''))
  .refine(
    (value) => localPhone.test(value) || internationalPhone.test(value),
    'Enter a Ghana number like 0XXXXXXXXX or +233XXXXXXXXX.',
  )
  .transform((value) => (value.startsWith('+233') ? value : `+233${value.slice(1)}`));

export const campusLocationSchema = z
  .string()
  .trim()
  .refine(isCampus, 'Choose your campus.');

export const otpSchema = z
  .string()
  .trim()
  .regex(otpCode, `Enter the ${limits.otpMin} to ${limits.otpMax} digit code.`);

export const shopNameSchema = z
  .string()
  .trim()
  .min(limits.shopNameMin, `Use at least ${limits.shopNameMin} characters.`)
  .max(limits.shopNameMax, `Use at most ${limits.shopNameMax} characters.`);

export const shopDescriptionSchema = z
  .string()
  .trim()
  .max(limits.shopDescriptionMax, `Use at most ${limits.shopDescriptionMax} characters.`)
  .transform((value) => (value.length === 0 ? null : value));

export const productTitleSchema = z
  .string()
  .trim()
  .min(limits.productTitleMin, 'Enter a title.')
  .max(limits.productTitleMax, `Use at most ${limits.productTitleMax} characters.`);

export const productDescriptionSchema = z
  .string()
  .trim()
  .max(limits.productDescriptionMax, `Use at most ${limits.productDescriptionMax} characters.`)
  .transform((value) => (value.length === 0 ? null : value));

const priceText = /^\d+(\.\d{1,2})?$/;

export const productPriceSchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? String(value) : value.trim()))
  .refine(
    (value) => priceText.test(value),
    `Enter a price greater than 0, up to ${limits.productPriceMax}, with at most ${priceFractionDigits} decimals.`,
  )
  .transform((value) => Number(value))
  .refine(
    (value) => value > 0 && value <= limits.productPriceMax,
    `Enter a price greater than 0, up to ${limits.productPriceMax}, with at most ${priceFractionDigits} decimals.`,
  );

export const filterPriceSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || (priceText.test(value) && Number(value) <= limits.productPriceMax),
    `Enter a price up to ${limits.productPriceMax}, with at most ${priceFractionDigits} decimals.`,
  )
  .transform((value) => (value.length === 0 ? undefined : Number(value)));

export const categoryIdSchema = z.string().trim().min(1, 'Choose a category.');

export const shopApplicationSchema = z.object({
  shopName: shopNameSchema,
  description: shopDescriptionSchema,
});

export const productDraftSchema = z.object({
  title: productTitleSchema,
  description: productDescriptionSchema,
  price: productPriceSchema,
  categoryId: categoryIdSchema,
});

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message.')
  .max(limits.messageMax, `Use at most ${limits.messageMax} characters.`);

export const orderQuantitySchema = z
  .number()
  .int('Enter a whole number.')
  .min(1, 'Quantity must be at least 1.')
  .max(limits.orderQuantityMax, `Quantity must be at most ${limits.orderQuantityMax}.`);

export const meetingPointSchema = z
  .string()
  .trim()
  .min(limits.meetingPointMin, 'Enter where the vendor should meet you.')
  .max(limits.meetingPointMax, `Use at most ${limits.meetingPointMax} characters.`);

export const orderNoteSchema = z
  .string()
  .trim()
  .max(limits.orderNoteMax, `Use at most ${limits.orderNoteMax} characters.`)
  .transform((value) => (value.length === 0 ? null : value));

export const orderSheetSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, 'Choose a product.'),
        quantity: orderQuantitySchema,
      }),
    )
    .min(1, 'Add at least one item.')
    .max(limits.orderItemMax, `An order can include at most ${limits.orderItemMax} items.`),
  meetingPoint: meetingPointSchema,
  note: orderNoteSchema,
});

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new Error(result.error.issues[0]?.message ?? 'Check that field.');
}

export function fieldError<T>(schema: z.ZodType<T>, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? 'Check that field.';
}
