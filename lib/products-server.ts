// Server-only products functions
import { getDatabase } from './mongodb-server'
import { ObjectId } from 'mongodb'

export interface Product {
  _id: string
  name: string
  category: string
  price: number
  stock: number
  minStock: number
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  supplier: string
  image?: string
  createdAt: Date
  updatedAt: Date
}

type ProductDocument = Omit<Product, '_id'> & { _id?: ObjectId }

function buildIdFilter(id: string) {
  try {
    const objectId = new ObjectId(id)
    return { $or: [{ _id: objectId }, { _id: id as any }] }
  } catch {
    return { _id: id as any }
  }
}

export async function createProduct(productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const db = await getDatabase()
  const products = db.collection<ProductDocument>('products')
  
  const product: Omit<ProductDocument, '_id'> = {
    ...productData,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const result = await products.insertOne(product)
  return { ...product, _id: result.insertedId.toString() }
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDatabase()
  const products = db.collection<ProductDocument>('products')
  
  const result = await products.find({}).toArray()
  return result
    .filter((product): product is ProductDocument & { _id: ObjectId } => !!product._id)
    .map(product => ({
      ...product,
      _id: product._id.toString()
    }))
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const db = await getDatabase()
  const products = db.collection<ProductDocument>('products')
  try {
    const { _id, createdAt, updatedAt, ...safeUpdates } = updates
    const result = await products.findOneAndUpdate(
      buildIdFilter(id),
      { $set: { ...safeUpdates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    const updated = (result && typeof result === 'object' && 'value' in result)
      ? (result as { value: ProductDocument | null }).value
      : (result as ProductDocument | null)
    if (!updated) return null;
    if (!updated._id) return null
    const updatedId = updated._id
    return {
      ...updated,
      _id: updatedId.toString()
    }
  } catch (error) {
    console.error('updateProduct error:', error);
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = await getDatabase()
  const products = db.collection<ProductDocument>('products')
  
  const result = await products.deleteOne(buildIdFilter(id) as any)
  return result.deletedCount > 0
}
