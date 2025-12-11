import type { Product } from '@shared/schema';

/**
 * Parse product detail markdown response into a Product object
 */
export function parseProductDetailMarkdown(markdown: string): Product | null {
  try {
    // Extract product name
    const nameMatch = markdown.match(/\*\*Name:\*\*\s*([^\n]+)/);
    const name = nameMatch ? nameMatch[1].trim() : '';
    
    // Extract price
    const priceMatch = markdown.match(/\*\*Price:\*\*\s*₹([\d,]+)/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
    
    // Extract slug
    const slugMatch = markdown.match(/\*\*Product Slug:\*\*\s*([^\n]+)/);
    const slug = slugMatch ? slugMatch[1].trim() : '';
    
    // Extract article ID
    const articleIdMatch = markdown.match(/Article ID:\s*([^\n]+)/);
    const articleId = articleIdMatch ? articleIdMatch[1].trim() : '';
    
    // Extract store ID
    const storeIdMatch = markdown.match(/Store ID:\s*(\d+)/);
    const storeId = storeIdMatch ? parseInt(storeIdMatch[1], 10) : 1;
    
    // Extract SKU for item ID
    const skuMatch = markdown.match(/SKU:\s*(\d+)/);
    const itemId = skuMatch ? parseInt(skuMatch[1], 10) : 0;
    
    // Extract availability
    const availabilityMatch = markdown.match(/\*\*Availability:\*\*\s*([^\n]+)/);
    const isAvailable = availabilityMatch ? availabilityMatch[1].includes('In Stock') : false;
    
    // Extract return policy
    const returnMatch = markdown.match(/\*\*Return Policy:\*\*\s*([^\n]+)/);
    const isReturnable = returnMatch ? returnMatch[1].includes('Returnable') : false;
    
    // Extract COD
    const codMatch = markdown.match(/\*\*Cash on Delivery:\*\*\s*([^\n]+)/);
    const isCodAvailable = codMatch ? codMatch[1].includes('Available') : false;
    
    // Extract seller
    const sellerMatch = markdown.match(/\*\*Seller:\*\*\s*([^\n]+)/);
    const seller = sellerMatch ? sellerMatch[1].trim() : '';
    
    // Extract MRP
    const mrpMatch = markdown.match(/MRP:\s*₹([\d,.]+)/);
    const markedPrice = mrpMatch ? parseInt(mrpMatch[1].replace(/[,.]/g, '').slice(0, -2) || mrpMatch[1].replace(/,/g, ''), 10) : price;

    if (!name) {
      return null;
    }

    return {
      id: String(itemId || slug),
      uid: itemId,
      slug,
      name,
      brandName: '',
      brand: { name: '' },
      images: [],
      price: { effective: { min: price }, marked: { min: markedPrice } },
      effectivePrice: price,
      markedPrice,
      itemId,
      articleId,
      description: `Seller: ${seller}. ${isReturnable ? 'Returnable within 15 days.' : ''} ${isCodAvailable ? 'Cash on Delivery available.' : ''}`,
    };
  } catch (e) {
    console.error('Error parsing product detail markdown:', e);
    return null;
  }
}

/**
 * Parse MCP markdown product response into structured Product objects
 */
export function parseMarkdownProducts(markdown: string): Product[] {
  const products: Product[] = [];
  
  // Split by product entries (marked by numbered items like "**1.", "**2.", etc.)
  const productBlocks = markdown.split(/\*\*\d+\./g).slice(1);
  
  for (const block of productBlocks) {
    try {
      // Extract product name (first line after split, before **Brand:**)
      const nameMatch = block.match(/([^*]+)\*\*/);
      const name = nameMatch ? nameMatch[1].trim() : '';
      
      // Extract brand
      const brandMatch = block.match(/\*\*Brand:\*\*\s*([^\n]+)/);
      const brandName = brandMatch ? brandMatch[1].trim() : '';
      
      // Extract slug (in backticks)
      const slugMatch = block.match(/\*\*Slug:\*\*\s*`([^`]+)`/);
      const slug = slugMatch ? slugMatch[1].trim() : '';
      
      // Extract price (after ₹)
      const priceMatch = block.match(/\*\*Price:\*\*\s*₹([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      
      // Extract original/marked price if available
      const markedPriceMatch = block.match(/~~₹([\d,]+)~~/);
      const markedPrice = markedPriceMatch ? parseInt(markedPriceMatch[1].replace(/,/g, ''), 10) : price;
      
      // Extract discount
      const discountMatch = block.match(/\((\d+%\s*OFF)\)/i);
      const discount = discountMatch ? discountMatch[1] : undefined;
      
      // Extract image URL
      const imageMatch = block.match(/\[View Product Image\]\(([^)]+)\)/);
      const imageUrl = imageMatch ? imageMatch[1] : '';
      
      // Extract Item ID
      const itemIdMatch = block.match(/\*\*Item ID:\*\*\s*(\d+)/);
      const itemId = itemIdMatch ? parseInt(itemIdMatch[1], 10) : 0;
      
      // Extract Article ID
      const articleIdMatch = block.match(/\*\*Article ID:\*\*\s*([^\s\n]+)/);
      const articleId = articleIdMatch ? articleIdMatch[1].trim() : '';
      
      // Extract rating if present (not "Not yet rated")
      const ratingMatch = block.match(/\*\*Rating:\*\*\s*([\d.]+)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

      if (name && slug) {
        products.push({
          id: String(itemId || slug),
          uid: itemId,
          slug,
          name,
          brandName,
          brand: { name: brandName },
          images: imageUrl ? [{ url: imageUrl }] : [],
          price: { effective: { min: price }, marked: { min: markedPrice } },
          effectivePrice: price,
          markedPrice: markedPrice,
          discount,
          rating,
          itemId,
          articleId,
        });
      }
    } catch (e) {
      console.error('Error parsing product block:', e);
    }
  }
  
  return products;
}

/**
 * Parse MCP response which can be either markdown string or JSON object
 */
export function parseMCPProductResponse(result: unknown): Product[] {
  // If result is a string (markdown format from MCP)
  if (typeof result === 'string') {
    return parseMarkdownProducts(result);
  }
  
  // Handle JSON object format (fallback for other responses)
  if (typeof result === 'object' && result !== null) {
    const data = result as Record<string, unknown>;
    let productList: Array<Record<string, unknown>> = [];
    
    if (Array.isArray(data)) {
      productList = data;
    } else if (data?.products && Array.isArray(data.products)) {
      productList = data.products as Array<Record<string, unknown>>;
    } else if (data?.items && Array.isArray(data.items)) {
      productList = data.items as Array<Record<string, unknown>>;
    }
    
    return productList.map((p: Record<string, unknown>) => ({
      id: String(p.uid || p.id || ''),
      uid: p.uid as number,
      slug: p.slug as string,
      name: p.name as string,
      brand: p.brand as { name: string } | undefined,
      brandName: (p.brand as { name?: string })?.name,
      images: p.images as Array<{ url: string }> | undefined,
      price: p.price as { effective?: { min: number }; marked?: { min: number } } | undefined,
      discount: p.discount as string | undefined,
      rating: p.rating as number | undefined,
      itemId: (p as { item_id?: number }).item_id,
      articleId: (p as { article_id?: string }).article_id,
    }));
  }
  
  return [];
}
