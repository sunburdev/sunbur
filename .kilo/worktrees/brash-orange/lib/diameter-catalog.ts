// Reference sizes, not an inventory or a price list. Verified 2026-09-16.
export const crownDiameters = [32, 42, 52, 62, 68, 72, 82, 92, 102, 107, 112, 120, 122, 127, 132, 142, 152, 162, 172, 182, 200, 212, 225, 250] as const

export const diameterSources = [
  { title: "KEOS: размеры коронок для бурения", url: "https://keos.pro/catalog/osnastka/almaznye_koronki/koronki_dlya_ustanovok_i_almaznykh_dreley/", note: "Размеры коронок, включая 112, 122, 127 и 132 мм. Наличие у мастера уточняется отдельно." },
  { title: "Alteco: коронка Pro Ø120 мм", url: "https://alteco.kz/uploads/pdf/diamond-bits/bits-pro.pdf", note: "Каталог производителя подтверждает отдельный размер 120 мм." },
  { title: "Hauff: подбор кольцевых уплотнений", url: "https://www.hauff-technik.de/fileadmin/user_upload/katalog_kabel_de_180711.pdf", note: "Диаметр отверстия зависит также от выбранной системы уплотнения. Универсального зазора для всех проходов нет." },
] as const

export type DiameterOption = { diameter: number; clearance: number; fits: boolean; cost: number | null }
