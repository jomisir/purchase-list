/**
 * Bundled product artwork.
 *
 * These are hand-drawn illustrations shipped with the app, not photographs of
 * a specific unit for sale. `fidelity` records how literal each one is:
 *   - `product`        drawn to resemble that specific model
 *   - `representative` stands in for a whole category (shoes, clothing, ...)
 * The UI uses it so the app never implies an image is a real product photo.
 */
import backpack from './backpack.svg'
import belts from './belts.svg'
import casioWatch from './casio-watch.svg'
import clothing from './clothing.svg'
import deskLamp from './desk-lamp.svg'
import djiOsmoMobile from './dji-osmo-mobile.svg'
import ganCharger from './gan-charger.svg'
import iphone14Pro from './iphone-14-pro.svg'
import jblEarbuds from './jbl-earbuds.svg'
import jblHeadphones from './jbl-headphones.svg'
import laptopBag from './laptop-bag.svg'
import ledStrip from './led-strip.svg'
import perfumeAfnan9pm from './perfume-afnan-9pm.svg'
import perfumeClubDeNuit from './perfume-club-de-nuit.svg'
import perfumeKhamrah from './perfume-khamrah.svg'
import perfumeYara from './perfume-yara.svg'
import powerBank from './power-bank.svg'
import roomDecor from './room-decor.svg'
import shoes from './shoes.svg'
import skateboard from './skateboard.svg'
import skincare from './skincare.svg'
import smartwatch from './smartwatch.svg'
import sunglasses from './sunglasses.svg'
import wallet from './wallet.svg'
import waterBottle from './water-bottle.svg'

export type ImageFidelity = 'product' | 'representative'

export interface BuiltinImage {
  key: string
  src: string
  label: string
  fidelity: ImageFidelity
}

function entry(
  key: string,
  src: string,
  label: string,
  fidelity: ImageFidelity,
): [string, BuiltinImage] {
  return [key, { key, src, label, fidelity }]
}

export const BUILTIN_IMAGES: Record<string, BuiltinImage> = Object.fromEntries([
  entry('iphone-14-pro', iphone14Pro, 'iPhone 14 Pro', 'product'),
  entry('power-bank', powerBank, 'MagSafe power bank', 'product'),
  entry('gan-charger', ganCharger, 'GaN charger', 'product'),
  entry('jbl-headphones', jblHeadphones, 'Over-ear headphones', 'product'),
  entry('jbl-earbuds', jblEarbuds, 'Wireless earbuds', 'product'),
  entry('smartwatch', smartwatch, 'Sports smartwatch', 'product'),
  entry('dji-osmo-mobile', djiOsmoMobile, 'Phone gimbal', 'product'),
  entry('casio-watch', casioWatch, 'Analog steel watch', 'product'),
  entry('perfume-afnan-9pm', perfumeAfnan9pm, 'Afnan 9PM bottle', 'product'),
  entry('perfume-khamrah', perfumeKhamrah, 'Lattafa Khamrah bottle', 'product'),
  entry('perfume-club-de-nuit', perfumeClubDeNuit, 'Club de Nuit Intense bottle', 'product'),
  entry('perfume-yara', perfumeYara, 'Lattafa Yara bottle', 'product'),
  entry('dji-osmo', djiOsmoMobile, 'Phone gimbal', 'product'),
  entry('shoes', shoes, 'Shoes', 'representative'),
  entry('clothing', clothing, 'Clothing', 'representative'),
  entry('backpack', backpack, 'Backpack', 'representative'),
  entry('laptop-bag', laptopBag, 'Laptop bag', 'representative'),
  entry('sunglasses', sunglasses, 'Sunglasses', 'representative'),
  entry('wallet', wallet, 'Wallet', 'representative'),
  entry('belts', belts, 'Belts', 'representative'),
  entry('led-strip', ledStrip, 'LED strip lights', 'representative'),
  entry('desk-lamp', deskLamp, 'LED desk lamp', 'representative'),
  entry('room-decor', roomDecor, 'Room decoration', 'representative'),
  entry('skateboard', skateboard, 'Skateboard', 'representative'),
  entry('skincare', skincare, 'Skincare & hygiene', 'representative'),
  entry('water-bottle', waterBottle, 'Water bottle', 'representative'),
])

export const BUILTIN_IMAGE_LIST: BuiltinImage[] = Object.values(BUILTIN_IMAGES).filter(
  (image, index, all) => all.findIndex((other) => other.src === image.src) === index,
)

export function builtinImage(key: string): BuiltinImage | undefined {
  return BUILTIN_IMAGES[key]
}
