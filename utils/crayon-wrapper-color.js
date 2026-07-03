const TARGET_CONTRAST_RATIO = 3;

function hexToRgb(hex) {
	const normalized = hex.replace("#", "");
	return {
		r: parseInt(normalized.slice(0, 2), 16),
		g: parseInt(normalized.slice(2, 4), 16),
		b: parseInt(normalized.slice(4, 6), 16),
	};
}

function rgbToHex({ r, g, b }) {
	const toHex = (value) => Math.round(value).toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance({ r, g, b }) {
	const channel = (value) => {
		const normalized = value / 255;
		return normalized <= 0.03928
			? normalized / 12.92
			: Math.pow((normalized + 0.055) / 1.055, 2.4);
	};

	return (
		0.2126 * channel(r) +
		0.7152 * channel(g) +
		0.0722 * channel(b)
	);
}

function contrastRatio(colorA, colorB) {
	const luminanceA = relativeLuminance(colorA);
	const luminanceB = relativeLuminance(colorB);
	const lighter = Math.max(luminanceA, luminanceB);
	const darker = Math.min(luminanceA, luminanceB);

	return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHsl({ r, g, b }) {
	const red = r / 255;
	const green = g / 255;
	const blue = b / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const lightness = (max + min) / 2;
	let hue = 0;
	let saturation = 0;

	if (max !== min) {
		const delta = max - min;
		saturation =
			lightness > 0.5
				? delta / (2 - max - min)
				: delta / (max + min);

		if (max === red) {
			hue = (green - blue) / delta + (green < blue ? 6 : 0);
		} else if (max === green) {
			hue = (blue - red) / delta + 2;
		} else {
			hue = (red - green) / delta + 4;
		}

		hue /= 6;
	}

	return { h: hue * 360, s: saturation * 100, l: lightness * 100 };
}

function hslToRgb({ h, s, l }) {
	const hue = h / 360;
	const saturation = s / 100;
	const lightness = l / 100;

	if (saturation === 0) {
		const gray = lightness * 255;
		return { r: gray, g: gray, b: gray };
	}

	const hueToRgb = (p, q, t) => {
		let channel = t;
		if (channel < 0) channel += 1;
		if (channel > 1) channel -= 1;
		if (channel < 1 / 6) return p + (q - p) * 6 * channel;
		if (channel < 1 / 2) return q;
		if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
		return p;
	};

	const q =
		lightness < 0.5
			? lightness * (1 + saturation)
			: lightness + saturation - lightness * saturation;
	const p = 2 * lightness - q;

	return {
		r: hueToRgb(p, q, hue + 1 / 3) * 255,
		g: hueToRgb(p, q, hue) * 255,
		b: hueToRgb(p, q, hue - 1 / 3) * 255,
	};
}

function findWrapperInDirection(baseRgb, baseHsl, shouldDarken) {
	const start = shouldDarken ? baseHsl.l - 0.5 : baseHsl.l + 0.5;
	const end = shouldDarken ? 0 : 100;
	const step = shouldDarken ? -0.5 : 0.5;
	let bestMatch = null;
	let bestContrast = 0;

	for (let lightness = start; shouldDarken ? lightness >= end : lightness <= end; lightness += step) {
		const candidateRgb = hslToRgb({
			h: baseHsl.h,
			s: baseHsl.s,
			l: lightness,
		});
		const candidateContrast = contrastRatio(baseRgb, candidateRgb);

		if (candidateContrast >= TARGET_CONTRAST_RATIO) {
			return {
				hex: rgbToHex(candidateRgb).toUpperCase(),
				delta: Math.abs(lightness - baseHsl.l),
			};
		}

		if (candidateContrast > bestContrast) {
			bestContrast = candidateContrast;
			bestMatch = candidateRgb;
		}
	}

	return bestMatch
		? {
			hex: rgbToHex(bestMatch).toUpperCase(),
			delta: Infinity,
		}
		: null;
}

function crayonWrapperColor(hex) {
	const baseRgb = hexToRgb(hex);
	const baseLuminance = relativeLuminance(baseRgb);
	const baseHsl = rgbToHsl(baseRgb);
	const preferDarken = baseLuminance >= 0.5;

	const darkenResult = findWrapperInDirection(baseRgb, baseHsl, true);
	const lightenResult = findWrapperInDirection(baseRgb, baseHsl, false);

	const validResults = [darkenResult, lightenResult].filter(Boolean);
	const preferredResults = validResults.filter((result) => result.delta !== Infinity);
	const candidates = preferredResults.length > 0 ? preferredResults : validResults;

	if (candidates.length === 0) {
		return hex.toUpperCase();
	}

	const preferredDirection = preferDarken ? darkenResult : lightenResult;
	if (preferredDirection && preferredDirection.delta !== Infinity) {
		return preferredDirection.hex;
	}

	return candidates.sort((a, b) => a.delta - b.delta)[0].hex;
}

module.exports = {
	TARGET_CONTRAST_RATIO,
	contrastRatio,
	crayonWrapperColor,
	relativeLuminance,
};
