// Image Processing Helpers
function getPixelColor(data, width, x, y) {
  const idx = (y * width + x) * 4
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3],
  }
}

const colorIsBlack = (r, g, b) => r + g + b < 90

const getColorDifference = (color1, color2) => {
  const totalDifference =
    Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b)

  return totalDifference
}

const isColorMatch = (refColor, r, g, b, tolerance = 12) => {
  const totalDifference =
    Math.abs(refColor.r - r) + Math.abs(refColor.g - g) + Math.abs(refColor.b - b)
  return totalDifference < tolerance
}

module.exports = {
  getPixelColor,
  colorIsBlack,
  getColorDifference,
  isColorMatch,
}
