export function generatePixString(
  pixKey: string,
  merchantName: string = "Barbearia",
  merchantCity: string = "Cidade",
  amount?: number
): string {
  // Format generic string helper
  const format = (id: string, value: string) => {
    const length = value.length.toString().padStart(2, "0");
    return `${id}${length}${value}`;
  };

  const payloadFormatIndicator = format("00", "01");
  const merchantAccountInfo = format(
    "26",
    format("00", "br.gov.bcb.pix") + format("01", pixKey)
  );
  const merchantCategoryCode = format("52", "0000");
  const transactionCurrency = format("53", "986");
  const transactionAmount = amount ? format("54", amount.toFixed(2)) : "";
  const countryCode = format("58", "BR");
  const name = format("59", merchantName.substring(0, 25));
  const city = format("60", merchantCity.substring(0, 15));
  const additionalDataField = format("62", format("05", "***"));

  const payload =
    payloadFormatIndicator +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    name +
    city +
    additionalDataField +
    "6304";

  // Calculate CRC16 CCITT
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  crc &= 0xffff;
  
  return payload + crc.toString(16).toUpperCase().padStart(4, "0");
}
