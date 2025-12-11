import type { Product } from '@shared/schema';

export interface ProductDetail extends Product {
  availability?: string;
  stockCount?: number;
  size?: string;
  returnPolicy?: string;
  codAvailable?: boolean;
  deliveryEstimate?: string;
  store?: string;
  seller?: string;
  specifications?: Record<string, string>;
}

/**
 * Parse product detail markdown response into a Product object
 */
export function parseProductDetailMarkdown(markdown: string): ProductDetail | null {
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
    const articleIdMatch = markdown.match(/Article ID:\s*([^\n•]+)/);
    const articleId = articleIdMatch ? articleIdMatch[1].trim() : '';
    
    // Extract store ID
    const storeIdMatch = markdown.match(/Store ID:\s*(\d+)/);
    const storeId = storeIdMatch ? parseInt(storeIdMatch[1], 10) : 1;
    
    // Extract SKU for item ID
    const skuMatch = markdown.match(/SKU:\s*(\d+)/);
    const itemId = skuMatch ? parseInt(skuMatch[1], 10) : 0;
    
    // Extract availability
    const availabilityMatch = markdown.match(/\*\*Availability:\*\*\s*([^\n]+)/);
    const availability = availabilityMatch ? availabilityMatch[1].trim() : '';
    const isAvailable = availability.includes('In Stock');
    
    // Extract stock count
    const stockMatch = availability.match(/(\d+)\s*available/);
    const stockCount = stockMatch ? parseInt(stockMatch[1], 10) : 0;
    
    // Extract size
    const sizeMatch = markdown.match(/\*\*Size:\*\*\s*([^\n]+)/);
    const size = sizeMatch ? sizeMatch[1].trim() : '';
    
    // Extract return policy
    const returnMatch = markdown.match(/\*\*Return Policy:\*\*\s*([^\n]+)/);
    const returnPolicy = returnMatch ? returnMatch[1].trim() : '';
    const isReturnable = returnPolicy.includes('Returnable');
    
    // Extract COD
    const codMatch = markdown.match(/\*\*Cash on Delivery:\*\*\s*([^\n]+)/);
    const codAvailable = codMatch ? codMatch[1].includes('Available') : false;
    
    // Extract delivery estimate
    const deliveryMatch = markdown.match(/\*\*Delivery Estimate:\*\*\s*([^\n]+)/);
    const deliveryEstimate = deliveryMatch ? deliveryMatch[1].trim() : '';
    
    // Extract store
    const storeMatch = markdown.match(/\*\*Store:\*\*\s*([^\n]+)/);
    const store = storeMatch ? storeMatch[1].trim() : '';
    
    // Extract seller
    const sellerMatch = markdown.match(/\*\*Seller:\*\*\s*([^\n]+)/);
    const seller = sellerMatch ? sellerMatch[1].trim() : '';
    
    // Extract MRP
    const mrpMatch = markdown.match(/MRP:\s*₹([\d,.]+)/);
    let markedPrice = price;
    if (mrpMatch) {
      const mrpStr = mrpMatch[1].replace(/,/g, '');
      // Handle decimals like "225.00"
      markedPrice = parseInt(parseFloat(mrpStr).toString(), 10);
    }
    
    // Extract specifications
    const specifications: Record<string, string> = {};
    const specSection = markdown.match(/\*\*Specifications:\*\*\n([\s\S]*?)(?=\n\n|\*\*Cart|$)/);
    if (specSection) {
      const specLines = specSection[1].split('\n');
      for (const line of specLines) {
        const specMatch = line.match(/•\s*([^:]+):\s*(.+)/);
        if (specMatch) {
          specifications[specMatch[1].trim()] = specMatch[2].trim();
        }
      }
    }

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
      availability,
      stockCount,
      size,
      returnPolicy,
      codAvailable,
      deliveryEstimate,
      store,
      seller,
      specifications,
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
      
      // Extract original/marked price if available (strikethrough format)
      const markedPriceMatch = block.match(/~~₹([\d,]+)~~/);
      const markedPrice = markedPriceMatch ? parseInt(markedPriceMatch[1].replace(/,/g, ''), 10) : price;
      
      // Extract discount
      const discountMatch = block.match(/\((\d+%\s*OFF)\)/i);
      const discount = discountMatch ? discountMatch[1] : undefined;
      
      // Extract image URL - multiple patterns to catch different formats
      let imageUrl = '';
      const imagePatterns = [
        /\*\*Image:\*\*\s*\[View Product Image\]\(([^)]+)\)/,
        /\[View Product Image\]\(([^)]+)\)/,
        /\[Product Image\]\(([^)]+)\)/,
        /\(https:\/\/cdn\.tiraz5\.de[^)]+\)/,
      ];
      for (const pattern of imagePatterns) {
        const match = block.match(pattern);
        if (match) {
          imageUrl = match[1] || match[0].replace(/[()]/g, '');
          break;
        }
      }
      
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
