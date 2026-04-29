import pb from '@/lib/pocketbase/client'

export async function getOrFetchHsp(city: string, state: string): Promise<number | null> {
  if (!city || !state) return null

  try {
    const record = await pb
      .collection('pv_hsp_data')
      .getFirstListItem(`city~'${city}' && state~'${state}'`)
    if (record && record.annual_avg) {
      return record.annual_avg
    }
  } catch (err) {
    // Not found in DB, proceed to fetch via NASA Power API
  }

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)},${encodeURIComponent(state)},Brazil`,
    )
    const geoData = await geoRes.json()
    if (!geoData || geoData.length === 0) return null

    const lat = geoData[0].lat
    const lon = geoData[0].lon

    const nasaRes = await fetch(
      `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`,
    )
    const nasaData = await nasaRes.json()

    // Global Horizontal Irradiance (GHI) Annual Average
    const ann = nasaData?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN

    if (ann && ann > 0) {
      await pb.collection('pv_hsp_data').create({
        city,
        state,
        annual_avg: ann,
        jan: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.JAN || 0,
        feb: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.FEB || 0,
        mar: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.MAR || 0,
        apr: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.APR || 0,
        may: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.MAY || 0,
        jun: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.JUN || 0,
        jul: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.JUL || 0,
        aug: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.AUG || 0,
        sep: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.SEP || 0,
        oct: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.OCT || 0,
        nov: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.NOV || 0,
        dec: nasaData.properties.parameter.ALLSKY_SFC_SW_DWN.DEC || 0,
      })
      return ann
    }
  } catch (err) {
    console.error('Error fetching HSP from NASA API:', err)
  }
  return null
}
