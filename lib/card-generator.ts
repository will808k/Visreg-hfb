import pool from "./db"

export async function generateDigitalCardNumber(): Promise<string> {
  let cardNumber: string = ""
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    // Generate a random 6-digit number
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    cardNumber = `VIS${randomNum}`

    try {
      // Check if this card number exists in the visits table
      const [existing] = await pool.execute("SELECT COUNT(*) as count FROM visits WHERE digital_card_no = ?", [
        cardNumber,
      ])

      const count = (existing as any[])[0].count
      if (count === 0) {
        isUnique = true
      }
    } catch (error) {
      console.error("Error checking card number uniqueness:", error)
    }

    attempts++
  }

  if (!isUnique) {
    // Fallback to timestamp-based generation
    cardNumber = `VIS${Date.now().toString().slice(-6)}`
  }

  return cardNumber
}

export function validateDigitalCardNumber(cardNumber: string): boolean {
  // Basic validation - should be 9 characters starting with VIS
  const regex = /^VIS\d{6}$/
  return regex.test(cardNumber)
}
