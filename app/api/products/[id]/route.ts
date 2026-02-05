import { NextRequest, NextResponse } from 'next/server'
import { updateProduct, deleteProduct } from '@/lib/products-server'
import { verifyToken } from '@/lib/auth-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce admin role
    const token = request.cookies.get('auth-token')?.value
    const decoded = token ? verifyToken(token) : null
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const updates = await request.json()
    if (!updates.name || !updates.category || !updates.price || updates.stock === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    if (typeof updates.price !== 'number' || updates.price <= 0) {
      return NextResponse.json({ message: 'Invalid price value' }, { status: 400 })
    }
    if (typeof updates.stock !== 'number' || updates.stock < 0) {
      return NextResponse.json({ message: 'Invalid stock value' }, { status: 400 })
    }
    if (updates.minStock !== undefined && updates.minStock < 0) {
      return NextResponse.json({ message: 'Invalid minStock value' }, { status: 400 })
    }

    if (updates.stock !== undefined) {
      updates.status = updates.stock === 0 
        ? 'Out of Stock' 
        : updates.stock < 10
          ? 'Low Stock'
          : 'In Stock'
    }

    const product = await updateProduct(id, updates)
    if (!product) {
      return NextResponse.json(
        { message: 'Product not found or update failed' },
        { status: 404 }
      )
    }
    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Update product error:', error?.message || error)
    return NextResponse.json(
      { message: 'Internal server error', error: error?.message || error },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce admin role
    const token = request.cookies.get('auth-token')?.value
    const decoded = token ? verifyToken(token) : null
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const success = await deleteProduct(id)
    
    if (!success) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
