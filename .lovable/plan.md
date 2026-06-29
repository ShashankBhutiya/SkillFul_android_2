# Add Themed Images to Category Cards

## Overview

Add a visually appealing, relevant thumbnail image to each category card on the home screen, making the categories more engaging and visually distinctive. Images will be rendered as subtle visuals with a gradient overlay to maintain text readability.

## What Changes

### 1. Add `coverImage` field to Category data

Each category in `src/data/questions.ts` will get a new optional `coverImage: string` field containing a curated Unsplash image URL. Examples:


| Category                     | Image Theme                    |
| ---------------------------- | ------------------------------ |
| Parenting                    | Parent holding child's hand    |
| Dating For Men               | Couple silhouette / date night |
| Female Self-Worth            | Confident woman                |
| Interview Prep               | Professional handshake         |
| Finance Basics               | Charts / coins                 |
| Leadership                   | Person at podium               |
| Stock Market                 | Trading floor / charts         |
| Chanakya for Corporate       | Chess strategy                 |
| Machiavellian Strategy       | Crown / chess                  |
| Building Masculine Character | Strong silhouette              |
| ...and all others            | Thematically matched           |


Images will use Unsplash source URLs (free, no API key needed) at a small resolution (400x300) to keep load times fast.

### 2. Redesign `CategoryCard` component

Update the `CategoryCard` in `src/components/CategorySelect.tsx` to:

- Render the `coverImage` as a thumbnail image with `object-cover`
- Add a dark gradient overlay (`bg-gradient-to-t from-black/70 via-black/40 to-black/20`) so white text remains readable
- Position the category name, progress bar, and stats over the image
- Make cards taller (increase padding/min-height) to showcase the image
- Add a subtle loading skeleton while images load
- Locked cards get a desaturated/blurred treatment on the image

### 3. Image loading optimization

- Use `loading="lazy"` on all images
- Add a CSS transition for fade-in on load
- Keep the existing gradient fallback visible until the image loads

## Technical Details

**Files modified:**

- `src/data/questions.ts` -- Add `coverImage` string to the `Category` interface and a URL to each category object
- `src/components/CategorySelect.tsx` -- Update `CategoryCard` to render background image with overlay
- `src/components/SwipeCard.tsx` -- Optionally show the category image in the card header badge area

**No new dependencies required.** Uses standard HTML `<img>` with Tailwind classes.