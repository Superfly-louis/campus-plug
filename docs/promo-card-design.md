# Promotional card

Home and Explore use this card for every marketplace promotion. New campaigns use the same component. Do not design a one-off banner.

## Component

`src/components/marketplace/PromoCard.tsx`

Pass the label, headline, optional lime highlight, description, image, button label, and button action. The background, type, and spacing stay fixed.

Colours: `promoCard` in `src/constants/theme.ts`.

Sizes: `promoCardLayout` in `src/constants/promoCard.ts`.

## Type

- Headlines: Plus Jakarta Sans Extra Bold.
- Label, description, and button: Plus Jakarta Sans Semibold.

## Layout

The photo covers the right side of the card. A navy fade runs from the left so the text stays readable and the photo blends in. There is no frame, circle, wave, or doodle.

The current food and shop slides still come from `src/constants/promos.ts`. `PromoBanner` maps each slide onto `PromoCard`.
