// Test script to add sample data to Firestore
// Run this in browser console or create a test page

import { createBox } from './boxes'
import { MeatBox, BoxStatus } from '../types'

export async function addSampleBox() {
  const sampleBox: Omit<MeatBox, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Contrafilé Premium',
    brand: 'Fazenda Boa',
    photos: ['https://via.placeholder.com/400x300?text=Carne+1'],
    pricePerKg: 59.90,
    costPerKg: 45.00,
    totalKg: 20,
    remainingKg: 20,
    minKgPerPerson: 1,
    status: BoxStatus.WAITING_PURCHASES,
    paymentType: 'prepaid'
  }

  try {
    const boxId = await createBox(sampleBox)
    console.log('Sample box created with ID:', boxId)
    return boxId
  } catch (error) {
    console.error('Error creating sample box:', error)
  }
}

// For direct console use - copy and paste this function:
export const addSampleData = async () => {
  const { createBox } = await import('./boxes.js')

  const sampleBoxes = [
    {
      name: 'Contrafilé Premium',
      brand: 'Fazenda Boa Vista',
      photos: ['https://via.placeholder.com/400x300?text=Contrafilé+Premium'],
      pricePerKg: 59.90,
      costPerKg: 45.00,
      totalKg: 20,
      remainingKg: 20,
      minKgPerPerson: 1,
      status: BoxStatus.WAITING_PURCHASES,
      paymentType: 'prepaid' as const
    },
    {
      name: 'Picanha Especial',
      brand: 'Fazenda São João',
      photos: ['https://via.placeholder.com/400x300?text=Picanha+Especial'],
      pricePerKg: 69.90,
      costPerKg: 52.00,
      totalKg: 15,
      remainingKg: 15,
      minKgPerPerson: 1,
      status: BoxStatus.WAITING_PURCHASES,
      paymentType: 'prepaid' as const
    },
    {
      name: 'Maminha Suína',
      brand: 'Fazenda Verde',
      photos: ['https://via.placeholder.com/400x300?text=Maminha+Suína'],
      pricePerKg: 29.90,
      costPerKg: 22.00,
      totalKg: 25,
      remainingKg: 25,
      minKgPerPerson: 0.5,
      status: BoxStatus.WAITING_PURCHASES,
      paymentType: 'prepaid' as const
    }
  ]

  const results = []

  for (const box of sampleBoxes) {
    try {
      const boxId = await createBox(box)
      results.push({ name: box.name, id: boxId, success: true })
      console.log(`✅ ${box.name} criada com ID: ${boxId}`)
    } catch (error) {
      results.push({ name: box.name, error, success: false })
      console.error(`❌ Erro ao criar ${box.name}:`, error)
    }
  }

  console.log('Resultado final:', results)
  return results
}