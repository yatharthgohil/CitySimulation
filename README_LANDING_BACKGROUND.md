# Landing Page Animated Background Setup

## Overview
The landing page features a smooth blinking animation between two sign images (glowing and non-glowing) using CSS opacity transitions.

## Image Setup

### 1. Prepare Your Images

You need two JPEG images:
- **`sign-off.jpg`** - Sign without glow
- **`sign-on.jpg`** - Sign with glow

**Important:** 
- Remove the "dating fiction" text from both images before using them
- Both images should be the same size and aligned
- Recommended: Use PNG format for better quality, or high-quality JPEG
- For pixel art, keep as raster (PNG/JPEG) - don't convert to SVG

### 2. Place Images

Create the directory and place your images:
```
public/
  assets/
    landing/
      sign-off.jpg  (or .png)
      sign-on.jpg   (or .png)
```

### 3. Update Image Paths (if needed)

If your images have different names or paths, update `AnimatedSignBackground.tsx`:

```tsx
backgroundImage: 'url(/assets/landing/your-sign-off.jpg)',
backgroundImage: 'url(/assets/landing/your-sign-on.jpg)',
```

## Animation Details

### Current Animation
- **Duration:** 4 seconds per cycle
- **Easing:** `ease-in-out` for smooth transitions
- **Effect:** Smooth crossfade between glowing and non-glowing states

### Customization Options

#### Slower Blink (6 seconds)
Edit `src/app/globals.css`:
```css
animation: 'signBlink 6s ease-in-out infinite',
```

#### Faster Blink (2 seconds)
```css
animation: 'signBlink 2s ease-in-out infinite',
```

#### More Dramatic Glow
Uncomment the alternative keyframe in `globals.css` for a more pronounced glow effect with multiple opacity stops.

#### Different Timing Function
Try these alternatives:
- `ease-in-out` - Smooth (current)
- `ease` - Starts slow, ends fast
- `linear` - Constant speed
- `cubic-bezier(0.4, 0, 0.6, 1)` - Custom curve

## How It Works

1. **Two Layers:** Two absolutely positioned divs overlay each other
2. **Opacity Animation:** Each layer animates opacity from 0 to 1
3. **Reverse Timing:** The glowing layer uses `reverse` so when one fades in, the other fades out
4. **Smooth Transition:** CSS handles the crossfade smoothly

## Performance

- Uses CSS animations (GPU-accelerated)
- No JavaScript required for animation
- Minimal performance impact
- Works on all modern browsers

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Troubleshooting

### Images not showing
- Check file paths match exactly
- Ensure images are in `public/assets/landing/`
- Check browser console for 404 errors

### Animation not smooth
- Ensure both images are the same dimensions
- Check that images are properly aligned
- Try increasing animation duration

### Images look pixelated
- Use higher resolution source images
- For pixel art, ensure images are at native resolution
- Avoid scaling images in CSS (use `bg-cover` or `bg-contain`)

### Animation too fast/slow
- Adjust the `4s` duration in both the component and CSS
- Modify the keyframe timing for different effects

