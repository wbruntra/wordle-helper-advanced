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

const colorIsBlack = (r, g, b) => r + g + b < 100

const getColorDifference = (color1, color2) => {
  const totalDifference =
    Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b)

  return totalDifference
}

module.exports = {
  getPixelColor,
  colorIsBlack,
  getColorDifference,
}
