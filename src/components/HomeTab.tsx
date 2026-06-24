/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Megaphone, Edit3, PlusCircle, CheckCircle, Tag, EyeOff, Sparkles, X, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Product, User, SystemSettings, SystemNotification, ProductOption } from '../types';

interface HomeTabProps {
  products: Product[];
  currentUser: User | null;
  settings: SystemSettings;
  notifications: SystemNotification[];
  onAddToCart: (product: Product, quantity: number, selectedOptions: { [category: string]: string }) => void;
  onAddProduct: (productData: Omit<Product, 'id' | 'salesVolume'>) => void;
  onEditProduct: (updatedProduct: Product) => void;
  onUpdateSettings?: (updatedSettings: SystemSettings) => void;
}

export default function HomeTab({ 
  products, 
  currentUser, 
  settings, 
  notifications, 
  onAddToCart, 
  onAddProduct, 
  onEditProduct,
  onUpdateSettings
}: HomeTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Pagination & Device-based limit (9 for laptop/tablet, 10 for mobile)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setItemsPerPage(9); // Laptops and tablets: 9 pieces per page
      } else {
        setItemsPerPage(10); // Smartphones: 10 pieces per page
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset to first page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);
  
  // Banner slide index
  const [currentSlide, setCurrentSlide] = useState(0);

  // Modal active states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Category management states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🛍️');
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('');
  const [editingCategoryIcon, setEditingCategoryIcon] = useState('');

  // Dynamic injection so it always displays regardless of local DB state
  const loanBannerUrl = "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=1200&h=400";
  const activeBanners = [...settings.banners];
  if (!activeBanners.includes(loanBannerUrl)) {
    activeBanners.push(loanBannerUrl);
  }

  // Selected options state per product ID: { [productId]: { "Size": "M", "Color": "Neon Red" } }
  const [cardSelections, setCardSelections] = useState<{ [prodId: string]: { [category: string]: string } }>({});
  
  // Item quantities state per product ID (on-card state)
  const [cardQuantities, setCardQuantities] = useState<{ [prodId: string]: number }>({});

  // Add Product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState(0);
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdMerchantName, setNewProdMerchantName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('APPAREL');
  // Dynamic Option Generator: e.g. [ { category: "ขนาด", list: [{name:"M", stock: 10}] } ]
  const [newOptions, setNewOptions] = useState<ProductOption[]>([
    { category: "ขนาด (Size)", list: [{ name: "S", stock: 10 }, { name: "M", stock: 10 }, { name: "L", stock: 10 }] },
    { category: "สี (Color)", list: [{ name: "แดงนีออน (Neon Red)", stock: 10 }, { name: "ขาวคลีน (Pure White)", stock: 10 }] }
  ]);

  const [optionCategoryForm, setOptionCategoryForm] = useState('');
  const [optionItemsForm, setOptionItemsForm] = useState(''); // comma-separated

  const themePrimary = settings.themeColor || '#FF1E27';
  const themeGradientEnd = settings.themeGradientEnd || '#FF5E62';

  // Dynamic categories extracted from both settings.customCategories and actual products
  const dynamicCategories = React.useMemo(() => {
    const list: { key: string; label: string; icon: string }[] = [
      { key: 'ALL', label: 'ทั้งหมด (Show All)', icon: '🛍️' }
    ];

    const blacklistedKeys = ['HAIRCARE', 'MAKEUP', 'SKINCARE', 'PERFUME', 'BODYCARE'];

    // 1. Add all settings.customCategories (filtering out the blacklisted ones!)
    const customCats = (settings.customCategories || []).filter(c => 
      !blacklistedKeys.includes(c.key.toUpperCase()) && !blacklistedKeys.includes(c.label.toUpperCase())
    );
    customCats.forEach(cat => {
      if (!list.some(c => c.key === cat.key)) {
        list.push(cat);
      }
    });

    // 2. Dynamic check: products categories (e.g. if any products have a category that's not in the customCats)
    products.forEach(p => {
      if (p.category) {
        const catKey = p.category.toUpperCase();
        if (blacklistedKeys.includes(catKey) || blacklistedKeys.includes(p.category.toUpperCase())) {
          return; // Skip blacklisted categories
        }
        const exists = list.some(c => c.key === catKey || c.label.toUpperCase() === p.category?.toUpperCase());
        if (!exists) {
          list.push({
            key: catKey,
            label: p.category, // Use the product's actual category label
            icon: '🏷️'
          });
        }
      }
    });

    return list;
  }, [settings.customCategories, products]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;

    const newKey = newCategoryLabel.trim().toUpperCase();
    
    // Check if category key already exists
    const exists = dynamicCategories.some(c => c.key === newKey || c.label.toUpperCase() === newCategoryLabel.trim().toUpperCase());
    if (exists) {
      alert('มีหมวดหมู่นี้อยู่แล้วค่ะ');
      return;
    }

    const newCategoryObj = {
      key: newKey,
      label: newCategoryLabel.trim(),
      icon: newCategoryIcon || '🏷️'
    };

    const updatedCategories = [...(settings.customCategories || []), newCategoryObj];
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        customCategories: updatedCategories
      });
    }

    // Reset and close
    setNewCategoryLabel('');
    setNewCategoryIcon('🛍️');
    setShowAddCategoryModal(false);
  };

  const handleDeleteCategory = (categoryKey: string) => {
    // Delete instantly without window.confirm as requested by the user
    const updatedCategories = (settings.customCategories || []).filter(c => c.key !== categoryKey);
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        customCategories: updatedCategories
      });
    }

    // Clear this category from any products that have it, to instantly remove it from the system
    products.forEach(p => {
      if (p.category && p.category.toUpperCase() === categoryKey.toUpperCase()) {
        onEditProduct({
          ...p,
          category: '' // Reset product's category
        });
      }
    });

    if (selectedCategory === categoryKey) {
      setSelectedCategory('ALL');
    }
  };

  const handleUpdateCategory = (categoryKey: string, newLabel: string, newIcon: string) => {
    if (!newLabel.trim()) {
      alert('กรุณากรอกชื่อหมวดหมู่ด้วยค่ะ');
      return;
    }

    // Check if duplicate label exists in other categories
    const exists = (settings.customCategories || []).some(
      c => c.key !== categoryKey && c.label.toUpperCase() === newLabel.trim().toUpperCase()
    );
    if (exists) {
      alert('มีหมวดหมู่ชื่อนี้อยู่แล้วค่ะ');
      return;
    }

    const updatedCategories = (settings.customCategories || []).map(c => {
      if (c.key === categoryKey) {
        return {
          ...c,
          label: newLabel.trim(),
          icon: newIcon || '🛍️'
        };
      }
      return c;
    });

    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        customCategories: updatedCategories
      });
    }

    setEditingCategoryKey(null);
  };

  // Extract Announcements
  const systemAnnouncements = notifications.filter(n => n.isSystemAnnouncement);

  // Auto scroll banner (every 5 seconds)
  useEffect(() => {
    if (activeBanners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSlide, activeBanners.length]);

  // Set default options and quantities for products
  useEffect(() => {
    const initialSelections: { [prodId: string]: { [category: string]: string } } = {};
    const initialQuantities: { [prodId: string]: number } = {};

    products.forEach(p => {
      initialQuantities[p.id] = 1;

      const opts: { [category: string]: string } = {};
      p.options.forEach(opt => {
        if (opt.list.length > 0) {
          // Select first option with stock > 0
          const available = opt.list.find(item => item.stock > 0);
          opts[opt.category] = available ? available.name : opt.list[0].name;
        }
      });
      initialSelections[p.id] = opts;
    });

    setCardSelections(prev => ({ ...initialSelections, ...prev }));
    setCardQuantities(prev => ({ ...initialQuantities, ...prev }));
  }, [products]);

  // Filter approved products. (Admins/Merchants can also see paused/pending ones of their own)
  const filteredProducts = products.filter(p => {
    // Basic search filtering
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.merchantName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Category filtering
    const matchesCategory = selectedCategory === 'ALL' || 
      (p.category && p.category.toUpperCase() === selectedCategory.toUpperCase()) ||
      p.category === selectedCategory ||
      (selectedCategory === 'APPAREL' && (p.name.toLowerCase().includes('เสื้อ') || p.name.toLowerCase().includes('tee') || p.name.toLowerCase().includes('shirt'))) ||
      (selectedCategory === 'BAGS' && (p.name.toLowerCase().includes('กระเป๋า') || p.name.toLowerCase().includes('bag') || p.name.toLowerCase().includes('backpack'))) ||
      (selectedCategory === 'CAPS' && (p.name.toLowerCase().includes('หมวก') || p.name.toLowerCase().includes('cap') || p.name.toLowerCase().includes('hat'))) ||
      (selectedCategory === 'TUMBLER' && (p.name.toLowerCase().includes('แก้ว') || p.name.toLowerCase().includes('tumbler') || p.name.toLowerCase().includes('mug')));

    if (!matchesCategory) return false;

    // Normal customers only see 'approved' products (and not closed/paused ones)
    if (!currentUser) return p.status === 'approved';
    if (currentUser.role === 'Customer') return p.status === 'approved';
    
    // Merchant can see their own listings
    if (currentUser.role === 'Merchant') {
      return p.status === 'approved' || p.merchantId === currentUser.id;
    }

    // Admin can see everything
    return true;
  });

  // Pagination calculations
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Helper for generating page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }
    return pages;
  };

  // Quantity Change Handlers
  const handleQtyChange = (prodId: string, delta: number) => {
    const current = cardQuantities[prodId] || 1;
    const nextVal = Math.max(1, current + delta);
    setCardQuantities(prev => ({ ...prev, [prodId]: nextVal }));
  };

  const handleOptionSelect = (prodId: string, category: string, optionName: string) => {
    setCardSelections(prev => ({
      ...prev,
      [prodId]: {
        ...(prev[prodId] || {}),
        [category]: optionName
      }
    }));
  };

  const calculateStockForSelection = (product: Product, selection: { [cat: string]: string }) => {
    // If no option, use total
    if (product.options.length === 0) return product.totalStock;

    // Try to aggregate or match the option with stock constraints
    let minStock = Infinity;
    let foundConstraint = false;

    product.options.forEach(opt => {
      const selectedVal = selection[opt.category];
      if (selectedVal) {
        const match = opt.list.find(item => item.name === selectedVal);
        if (match) {
          minStock = Math.min(minStock, match.stock);
          foundConstraint = true;
        }
      }
    });

    return foundConstraint ? minStock : product.totalStock;
  };

  // Add Option category to form list
  const handleAddOptionCategory = () => {
    if (!optionCategoryForm.trim() || !optionItemsForm.trim()) {
      alert('กรุณากรอกทั้งชื่อประเภทตัวเลือก และตัวเลือกรวมถ้วนหน้า (ป้อนคั่นด้วยเครื่องหมายจุลภาค)');
      return;
    }

    const items = optionItemsForm.split(',').map(i => i.trim()).filter(Boolean);
    if (items.length === 0) return;

    const newList = items.map(name => ({ name, stock: 10 }));
    const newCategory: ProductOption = {
      category: optionCategoryForm.trim(),
      list: newList
    };

    setNewOptions([...newOptions, newCategory]);
    setOptionCategoryForm('');
    setOptionItemsForm('');
  };

  const handleRemoveOptionForm = (index: number) => {
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("รูปภาพขนาดใหญ่เกินไปค่ะ! (สูงสุดไม่เกิน 5MB) 📷");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isEdit) {
          if (editingProduct) {
            setEditingProduct({ ...editingProduct, image: base64String });
          }
        } else {
          setNewProdImage(base64String);
        }
      };
      reader.onerror = () => {
        alert("ไม่สามารถอ่านไฟล์รูปภาพได้ค่ะ กรุณาลองเลือกรูปภาพอื่นนะคะ ❌");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      alert('ระบุชื่อสินค้าด้วยค่ะ');
      return;
    }
    if (newProdPrice <= 0) {
      alert('ป้อนราคาสินค้าที่ถูกต้องด้วยค่ะ');
      return;
    }

    // Default image if vacant
    const imageUrl = newProdImage.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400";
    
    // Aggregated stock
    let calculatedTotalStock = 0;
    if (newOptions.length > 0) {
      // average total of first option items
      calculatedTotalStock = newOptions[0].list.reduce((sum, item) => sum + item.stock, 0);
    } else {
      calculatedTotalStock = 100; // default backup
    }

    const mId = currentUser?.id || "S99999";
    const mName = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin' 
      ? (newProdMerchantName.trim() || "แอดมินกลาง") 
      : (currentUser?.name || "Merchant Shop");

    onAddProduct({
      merchantId: mId,
      merchantName: mName,
      merchantPhone: currentUser?.phone || '0000000000',
      name: newProdName,
      description: newProdDesc,
      image: imageUrl,
      price: newProdPrice,
      status: currentUser?.role === 'Merchant' ? 'pending' : 'approved', // Merchant requires admin check, admin immediate approve!
      options: newOptions,
      totalStock: calculatedTotalStock,
      category: newProdCategory
    });

    // Reset Form
    setNewProdName('');
    setNewProdDesc('');
    setNewProdPrice(0);
    setNewProdImage('');
    setNewProdMerchantName('');
    setNewProdCategory('APPAREL');
    setNewOptions([
      { category: "ขนาด (Size)", list: [{ name: "S", stock: 10 }, { name: "M", stock: 10 }, { name: "L", stock: 10 }] },
      { category: "สี (Color)", list: [{ name: "แดงนีออน (Neon Red)", stock: 10 }, { name: "ขาวคลีน (Pure White)", stock: 10 }] }
    ]);
    setShowAddModal(false);
  };

  const startEditing = (p: Product) => {
    setEditingProduct(p);
    setShowEditModal(true);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    // Align option stocks with edited totalStock
    const alignedProduct = { ...editingProduct };
    if (alignedProduct.options && alignedProduct.options.length > 0) {
      alignedProduct.options = alignedProduct.options.map(opt => ({
        ...opt,
        list: opt.list.map(item => ({
          ...item,
          stock: alignedProduct.totalStock
        }))
      }));
    }

    onEditProduct(alignedProduct);
    setShowEditModal(false);
    setEditingProduct(null);
  };

  return (
    <div className="pb-28">
      {/* 2. Banner/Promotion Slides */}
      {activeBanners.length > 0 && (
        <div className="relative w-full aspect-[3/1] md:aspect-[3.5/1] bg-gray-100 overflow-hidden shadow-inner border-b border-gray-100">
          {activeBanners.map((url, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
                idx === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img 
                src={url} 
                alt={`Promotion Slide ${idx + 1}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Soft visual overlays */}
              {url === loanBannerUrl ? (
                <div className="absolute inset-0 bg-gradient-to-r from-red-950/95 via-black/40 to-transparent flex items-center p-3 sm:p-5 md:p-8">
                  <div className="text-white max-w-xl space-y-1 sm:space-y-1.5 md:space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-gray-900 shadow-sm font-display mb-0.5 inline-block">
                      💰 โครงการสินเชื่อเงินทุนหมุนเวียนร้านค้า
                    </span>
                    <h3 className="text-xs sm:text-sm md:text-xl lg:text-3xl font-black text-yellow-300 drop-shadow-sm leading-tight">
                      โอกาสทองของร้านค้า! สินเชื่อเพื่อธุรกิจ วงเงินสูง ดอกเบี้ยต่ำพิเศษ
                    </h3>
                    <p className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-150 line-clamp-1 sm:line-clamp-2 md:line-clamp-none opacity-95">
                      หมุนเวียนร้านค้าให้เติบโตอย่างมั่นคง สมัครง่าย เงื่อนไขไม่ยุ่งยาก ดอกเบี้ยเพียง 2% ต่อปี ผ่อนสบายนานสูงสุด 24 เดือน!
                    </p>
                    <div className="pt-0.5 md:pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setShowLoanModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-extrabold text-[8px] sm:text-[9px] md:text-xs px-3 sm:px-4 py-1.5 rounded-xl transition-all shadow hover:shadow-lg active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        ⚡ ดูเงื่อนไข / สมัครด่วนที่นี่
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 md:p-8">
                  <div className="text-white max-w-lg">
                    <span id="promo-slide-pill" className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm font-display mb-1.5 inline-block">
                      PROMOTION WEEK
                    </span>
                    <p className="text-xs md:text-sm font-medium text-gray-100 opacity-95 drop-shadow-sm leading-tight line-clamp-1 font-display">
                      ช้อปสินค้าคอลเลคชั่นพิเศษพร้อมโค้ดระบายของลดล้างสต็อกสูงถึง 50% ได้เลยวันนี้
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Manual navigation arrows */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur-xs transition-all pointer-events-auto cursor-pointer flex items-center justify-center border border-white/10"
            id="banner-prev-btn"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 sm:p-2 rounded-full bg-black/20 hover:bg-black/50 text-white backdrop-blur-xs transition-all pointer-events-auto cursor-pointer flex items-center justify-center border border-white/10"
            id="banner-next-btn"
            aria-label="Next slide"
          >
            <ChevronRight size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Banner controls (dots) */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                id={`banner-dot-${idx}`}
                onClick={() => setCurrentSlide(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-4 bg-white shadow-sm' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Search and Action Control Panel */}
      <div className="px-4 py-6 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <Search size={16} />
          </span>
          <input
            id="product-search-input"
            type="text"
            placeholder="ค้นหาชื่อสินค้า รายละเอียด หรือแบรนด์ร้านค้า..."
            className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold focus:outline-none focus:border-red-500 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 text-[11px] font-bold"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Floating Add Product button for store elements */}
        {currentUser && (currentUser.role === 'Merchant' || currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin') && (
          <button
            id="home-add-product-trigger"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold text-white shadow-md shadow-red-100 hover:opacity-[0.98] transition-opacity cursor-pointer font-display"
            style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
          >
            <PlusCircle size={16} />
            เพิ่มสินค้าใหม่ขายที่นี่
          </button>
        )}
      </div>

      {/* Interactive Online category navigation tabs */}
      <div id="category-scroller-bar" className="px-4 pb-6 md:px-8 max-w-7xl mx-auto overflow-x-auto scrollbar-none flex items-center gap-2">
        {dynamicCategories.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              id={`cat-filter-btn-${cat.key}`}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-full text-xs font-bold shrink-0 transition-transform active:scale-95 border outline-none select-none cursor-pointer ${
                isSelected 
                  ? 'text-white shadow-md shadow-red-100 border-transparent' 
                  : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-100'
              }`}
              style={isSelected ? {
                background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)`
              } : undefined}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
        
        {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin') && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="admin-add-category-btn"
              onClick={() => setShowAddCategoryModal(true)}
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-full text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shrink-0 transition-transform active:scale-95 cursor-pointer select-none"
            >
              <Plus size={12} className="stroke-[3]" />
              <span>เพิ่มหมวดหมู่</span>
            </button>
            <button
              type="button"
              id="admin-manage-categories-btn"
              onClick={() => setShowManageCategoriesModal(true)}
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-full text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 shrink-0 transition-transform active:scale-95 cursor-pointer select-none"
            >
              <Settings size={12} className="stroke-[3]" />
              <span>จัดการหมวดหมู่</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Products Grid Listings */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
          <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider font-display">
            {searchQuery 
              ? `ผลการค้นหาสำหรับ "${searchQuery}"` 
              : selectedCategory === 'ALL' 
                ? "รายการสินค้าทั้งหมดพร้อมจำหน่าย" 
                : (() => {
                    const found = dynamicCategories.find(c => c.key === selectedCategory);
                    return found ? `หมวด${found.label} ${found.icon}` : `หมวดหมู่ ${selectedCategory}`;
                  })()
            }
          </h2>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm p-8 flex flex-col items-center">
            <Tag size={48} className="text-gray-300 stroke-[1.2] mb-3" />
            <p className="text-sm font-bold text-gray-500">ไม่พบสินค้าในระบบ ณ ขณะนี้</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือรอให้แอดมินอัปเดตอนุมัติโพสต์เพิ่มค่ะ</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6">
              {paginatedProducts.map((p) => {
                const qty = cardQuantities[p.id] || 1;
                const selections = cardSelections[p.id] || {};
                const calculatedStock = calculateStockForSelection(p, selections);
                const isOut = p.totalStock <= 0 || calculatedStock <= 0;

                // Render product custom options selectors
                return (
                  <div 
                    key={p.id} 
                    id={`product-card-${p.id}`}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col hover:shadow-md transition-shadow relative"
                  >
                    {/* Status Indicator Badges for Merchants/Admins */}
                    {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin' || currentUser.id === p.merchantId) && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {p.status === 'pending' ? (
                          <span className="bg-yellow-100 border border-yellow-200 text-yellow-700 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            รออนุมัติกลาง
                          </span>
                        ) : p.status === 'rejected' ? (
                          <span className="bg-rose-100 border border-rose-200 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            ถูกปฏิเสธโบกมือลา
                          </span>
                        ) : p.status === 'paused' ? (
                          <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            ปิดขายชั่วคราว
                          </span>
                        ) : null}
                      </div>
                    )}

                    {/* Edit floating button for product editor (Merchant owns/Admin handles) */}
                    {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin' || currentUser.id === p.merchantId) && (
                      <button
                        id={`pcard-edit-btn-${p.id}`}
                        onClick={() => startEditing(p)}
                        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow hover:bg-white text-gray-600 transition-transform active:scale-95"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}

                    {/* Card Image Area */}
                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img 
                        src={p.image} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {isOut && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white backdrop-blur-[1px]">
                          <span className="text-xs font-bold border-2 border-white px-3 py-1 font-display tracking-widest uppercase">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body Information */}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        {/* Shop Identity bar */}
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter block truncate">
                          🏪 {p.merchantName}
                        </span>
                        {/* Product Headline Title */}
                        <h3 className="text-xs sm:text-sm font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                          {p.name}
                        </h3>
                        {/* Description Details (expanded slightly on desk) */}
                        <p className="text-[10px] text-gray-500 line-clamp-2 sm:line-clamp-3 leading-snug font-medium">
                          {p.description}
                        </p>
                        
                        {/* Sales capacity logs with monospace layout */}
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-mono">
                            ขายแล้ว {p.salesVolume} ชิ้น
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 font-mono">
                            คงเหลือ {p.totalStock} ชิ้น
                          </span>
                        </div>

                        {/* Options selects directly on product Card (Size, Color) */}
                        {p.options.length > 0 && (
                          <div className="border-t border-gray-50 mt-2 pt-2 space-y-2">
                            {p.options.map((opt) => (
                              <div key={opt.category} className="space-y-1">
                                <span className="text-[9px] font-bold text-gray-400 block">{opt.category}:</span>
                                <div className="flex flex-wrap gap-1">
                                  {opt.list.map((item) => {
                                    const isSelected = selections[opt.category] === item.name;
                                    const isOpOut = item.stock <= 0;
                                    return (
                                      <button
                                        key={item.name}
                                        type="button"
                                        disabled={isOpOut}
                                        onClick={() => handleOptionSelect(p.id, opt.category, item.name)}
                                        className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-bold transition-all border ${
                                          isOpOut 
                                            ? 'border-gray-100 text-gray-300 line-through bg-gray-50' 
                                            : isSelected 
                                              ? 'text-white border-transparent shadow shadow-red-100' 
                                              : 'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100'
                                        }`}
                                        style={isSelected && !isOpOut ? {
                                          background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)`
                                        } : undefined}
                                      >
                                        {item.name} {item.stock < 5 && item.stock > 0 ? `(${item.stock})` : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                        {/* Price and quantities */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm sm:text-base font-black font-mono text-gray-900">
                            {p.price.toLocaleString()} <span className="text-[10px] font-extrabold text-gray-400">THB</span>
                          </span>

                          {/* Increment / Decrement controls on-card */}
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(p.id, -1)}
                              className="p-1 px-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
                              disabled={isOut}
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-[11px] font-bold px-1.5 min-w-[16px] text-center text-gray-700 font-mono">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(p.id, 1)}
                              className="p-1 px-1.5 hover:bg-gray-100 text-gray-500 transition-colors"
                              disabled={isOut}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>

                        {/* Add to Cart checkout button */}
                        <button
                          type="button"
                          onClick={() => onAddToCart(p, qty, selections)}
                          disabled={isOut}
                          className={`w-full py-2.5 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer select-none ${
                            isOut ? 'bg-gray-150 text-gray-300 border border-gray-100 shadow-none pointer-events-none' : 'text-white'
                          }`}
                          style={!isOut ? {
                            background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)`
                          } : undefined}
                        >
                          <ShoppingCart size={13} />
                          {isOut ? 'สินค้าหมดเกลี้ยง' : 'ใส่ตะกร้าช้อปเลย'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
              <div id="product-pagination-bar" className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 bg-white border border-gray-150 rounded-2xl p-4 shadow-sm w-full max-w-md mx-auto">
                <span className="text-xs font-bold text-gray-500 font-display shrink-0">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 justify-center">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      document.getElementById('category-scroller-bar')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
                    id="pagination-prev-btn"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  
                  {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-xs font-extrabold text-gray-450 text-gray-400 select-none">
                          ...
                        </span>
                      );
                    }
                    const pageNum = page as number;
                    const isSelected = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        id={`pagination-page-btn-${pageNum}`}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          document.getElementById('category-scroller-bar')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          isSelected 
                            ? 'text-white shadow shadow-red-100' 
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        style={isSelected ? {
                          background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)`
                        } : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      document.getElementById('category-scroller-bar')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
                    id="pagination-next-btn"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. ADD PRODUCT POPUP MODAL */}
      {showAddModal && (
        <div id="add-product-popup-modal" className="fixed inset-0 z-50 bg-black/60 overflow-y-auto backdrop-blur-sm py-10 px-4 flex justify-center items-start">
          <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-50 p-6 animate-slide-up">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 font-display">
                📤 แบบฟอร์มเพิ่มสินค้าใหม่
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={triggerAddProduct} className="space-y-4">
              {currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin') && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">ระบุชื่อร้านค้า (สิทธิ์แอดมินเท่านั้น)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น PAOPAO Store, Street Club..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-red-500"
                    value={newProdMerchantName}
                    onChange={(e) => setNewProdMerchantName(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 font-display">ชื่อสินค้าจริง</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เสื้อท็อปนีออนสแปนเดกซ์"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-red-500"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 font-display">ราคาสินค้า (THB)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="เช่น 390"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-red-500 font-mono"
                    value={newProdPrice || ''}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 font-display">หมวดหมู่สินค้าออนไลน์ (Product Category)</label>
                <select
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-750 focus:outline-none focus:border-red-500"
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                >
                  {dynamicCategories.filter(cat => cat.key !== 'ALL').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.icon} {cat.label} ({cat.key})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">รายละเอียดคำอธิบายสินค้า</label>
                <textarea
                  placeholder="ป้อนรายละเอียด ทรง เนื้อผ้าสไตล์ ดีไซน์..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:border-red-500 h-20"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-755 text-gray-700 flex justify-between items-center">
                  <span>เลือกรูปภาพสินค้าจากในเครื่องหรือไฟล์ 📷</span>
                  {newProdImage && (
                    <button
                      type="button"
                      onClick={() => setNewProdImage('')}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative border-2 border-dashed border-gray-200 hover:border-red-400 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center bg-gray-50/50 cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-product-image"
                      onChange={(e) => handleImageFileChange(e, false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {newProdImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={newProdImage} 
                          alt="Preview" 
                          className="w-20 h-20 object-cover rounded-xl shadow-md border border-gray-100" 
                        />
                        <span className="text-[10px] text-emerald-600 font-bold block bg-emerald-55 px-2 py-0.5 rounded-full">✓ เลือกภาพสำเร็จ (ดึงข้อมูลไฟล์แล้ว)</span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1 py-1">
                        <div className="mx-auto w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                          📁
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 group-hover:text-red-500 transition-colors">คลิกหรือลากไฟล์รูปภาพมาวางที่นี่</p>
                        <p className="text-[9px] text-gray-400">รองรับไฟล์ภาพ JPEG, PNG, WEBP (ขนาดไม่เกิน 5MB)</p>
                      </div>
                    )}
                  </div>
                  {/* Provide a secondary manual fallback/URL input just in case */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 block sm:inline">หรือระบุ URL รูปภาพสินค้าได้ที่นี่:</span>
                    <input
                      type="text"
                      placeholder="ป้อน URL รูปภาพเป็นทางเลือกสำรอง..."
                      className="w-full bg-gray-100/60 border border-gray-200 rounded-xl py-1 px-2.5 text-[10px] font-semibold focus:outline-none focus:border-red-500"
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Option Builder */}
              <div className="border border-gray-100 p-3 rounded-2xl bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <span className="text-xs font-extrabold text-gray-700">⚙️ ตั้งค่าความจุตัวเลือก และคลังสินค้า (Stock & Options)</span>
                </div>

                {/* Categories listings */}
                {newOptions.map((opt, oIdx) => (
                  <div key={oIdx} className="bg-white p-2.5 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold text-[#FF1E27] block mb-1">{opt.category}:</span>
                      <div className="flex flex-wrap gap-1">
                        {opt.list.map(item => (
                          <span key={item.name} className="bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-600 font-bold font-mono">
                            {item.name} ({item.stock} ชิ้น)
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionForm(oIdx)}
                      className="text-[#FF1E27] font-bold text-xs hover:underline pl-2 shrink-0"
                    >
                      ลบออก
                    </button>
                  </div>
                ))}

                {/* Option category builder input */}
                <div className="space-y-2 border-t pt-2 mt-2">
                  <p className="text-[10px] font-bold text-gray-400">ต้องการเพิ่มตัวเลือกอื่นใหม่?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="เช่น ไซส์, ความจุ, วัสดุ"
                      className="bg-white border rounded-lg p-1.5 text-xs font-semibold focus:outline-none"
                      value={optionCategoryForm}
                      onChange={(e) => setOptionCategoryForm(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="ป้อนคอมม่าคั่น เช่น M, L, XL"
                      className="bg-white border rounded-lg p-1.5 text-xs font-semibold focus:outline-none"
                      value={optionItemsForm}
                      onChange={(e) => setOptionItemsForm(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOptionCategory}
                    className="w-full text-center py-1.5 text-xs text-rose-500 font-bold hover:bg-rose-100 rounded-lg border border-rose-200 border-dashed"
                  >
                    + กดตกลงเพิ่มตัวเลือกนี้ลงในฟอร์ม
                  </button>
                </div>
              </div>

              {currentUser?.role === 'Merchant' && (
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-semibold leading-relaxed border border-amber-100">
                  ⚠️ เรียนท่านพันธมิตรร้านค้า: สินค้าที่ส่งคำขอใหม่นี้จะถูกส่งไปหลังบ้าน PAOPAO รอการอนุมัติ (Approve) โดยแอดมินสูงสุดเป็นสำคัญ จึงจะสามารถวางจัดแสดงที่หน้าแรกได้
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-opacity hover:opacity-95"
                style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
              >
                {currentUser?.role === 'Merchant' ? 'ยืนยันและส่งคำขออนุมัติสินค้า' : 'เพิ่มสินค้าขายจริงทันทีในหน้าแรก'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDITING PRODUCT POPUP MODAL (Merchant on self, Admin on all) */}
      {showEditModal && editingProduct && (
        <div id="edit-product-popup-modal" className="fixed inset-0 z-50 bg-black/60 overflow-y-auto backdrop-blur-sm py-10 px-4 flex justify-center items-start">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-50 p-6 animate-slide-up">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-950 font-display">
                ✏️ แก้ไขสินค้าคลังสินค้า
              </h3>
              <button 
                onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 font-display">ชื่อสินค้า</label>
                <input
                  type="text"
                  required
                  placeholder="ชื่อสินค้า..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">ราคาจำหน่าย (THB)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-black font-mono"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600">สถานะขาย</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-700"
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                  >
                    <option value="approved">เปิดขายปกติ (Active)</option>
                    <option value="paused">ปิดขายชั่วคราว (Paused)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 font-display">หมวดหมู่สินค้าออนไลน์ (Product Category)</label>
                <select
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-red-500"
                  value={editingProduct.category || 'APPAREL'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                >
                  {dynamicCategories.filter(cat => cat.key !== 'ALL').map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.icon} {cat.label} ({cat.key})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">คำอธิบาย</label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium h-20"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 flex justify-between items-center">
                  <span>เลือกรูปภาพสินค้าจากในเครื่องหรือไฟล์ 📷</span>
                  {editingProduct.image && (
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative border-2 border-dashed border-gray-200 hover:border-red-400 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center bg-gray-50/50 cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      id="upload-edit-product-image"
                      onChange={(e) => handleImageFileChange(e, true)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {editingProduct.image ? (
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={editingProduct.image} 
                          alt="Preview" 
                          className="w-20 h-20 object-cover rounded-xl shadow-md border border-gray-100" 
                        />
                        <span className="text-[10px] text-emerald-600 font-bold block bg-emerald-55 px-2 py-0.5 rounded-full">✓ เลือกภาพสำเร็จ (ดึงข้อมูลไฟล์แล้ว)</span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1 py-1">
                        <div className="mx-auto w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                          📁
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 group-hover:text-red-500 transition-colors">คลิกหรือลากไฟล์รูปภาพใหม่มาวางที่นี่</p>
                        <p className="text-[9px] text-gray-400">รองรับไฟล์ภาพ JPEG, PNG, WEBP (ขนาดไม่เกิน 5MB)</p>
                      </div>
                    )}
                  </div>
                  {/* Provide a secondary manual fallback/URL input just in case */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 block sm:inline">หรือระบุ URL รูปภาพใหม่ได้ที่นี่:</span>
                    <input
                      type="text"
                      className="w-full bg-gray-100/60 border border-gray-200 rounded-xl py-1.5 px-3 text-[10px] font-semibold focus:outline-none focus:border-red-500"
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Simple stock & sales Volume updater */}
              <div className="grid grid-cols-2 gap-4 bg-rose-50 border-rose-100 border p-3 rounded-2xl">
                <div>
                  <span className="text-[11px] font-black text-rose-700 block mb-1">📦 อัปเดตสต็อกรวม</span>
                  <input
                    type="number"
                    min="0"
                    className="bg-white border rounded-xl py-1.5 px-3 uppercase text-xs font-black w-full font-mono"
                    value={editingProduct.totalStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, totalStock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <span className="text-[11px] font-black text-emerald-700 block mb-1">📈 ยอดจำหน่ายสะสม</span>
                  <input
                    type="number"
                    min="0"
                    className="bg-white border text-emerald-800 rounded-xl py-1.5 px-3 uppercase text-xs font-black w-full font-mono"
                    value={editingProduct.salesVolume || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, salesVolume: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>
              <span className="text-[9px] text-gray-450 text-gray-400 block mt-1">
                * หมายเหตุ: หากตัวเลือกของสต็อกหมด ลูกค้าจะไม่สามารถทำรายการหยิบของในหน้านั้นได้
              </span>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-opacity hover:opacity-95"
                style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
              >
                บันทึกการแก้ไขสินค้าทั้งหมด
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. BUSINESS LOAN POPUP MODAL */}
      {showLoanModal && (
        <div id="business-loan-popup-modal" className="fixed inset-0 z-50 bg-black/60 overflow-y-auto backdrop-blur-sm py-10 px-4 flex justify-center items-start">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-50 animate-slide-up">
            
            {/* Header image with money growth visual */}
            <div className="relative h-44 bg-gradient-to-r from-red-600 to-amber-500 overflow-hidden flex items-center justify-center p-6 text-white text-center">
              <div className="absolute inset-0 opacity-40">
                <img 
                  src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=600&h=300" 
                  alt="Background coins" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="relative z-10 space-y-1">
                <span className="bg-amber-400 text-gray-900 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  PAOPAO BUSINESS PARTNER
                </span>
                <h3 className="text-lg sm:text-xl font-black drop-shadow-md">
                  💰 บริการสินเชื่อเพื่อธุรกิจร้านค้า 💰
                </h3>
                <p className="text-xs text-red-50 font-semibold drop-shadow-sm">
                  เติมพลังทุนหมุนเวียน ขีดขยายศักยภาพร้านค้าของคุณให้ก้าวไกล
                </p>
              </div>
              <button 
                onClick={() => setShowLoanModal(false)}
                className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Highlight terms list */}
              <div className="space-y-3.5">
                <h4 className="text-sm font-black text-gray-900 border-l-4 border-red-500 pl-2">
                  📢 โอกาสทองของร้านค้า! สินเชื่อเพื่อธุรกิจ วงเงินสูง ดอกเบี้ยต่ำพิเศษ
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  หมุนเวียนร้านค้าให้เติบโตอย่างมั่นคง สมัครง่าย เงื่อนไขไม่ยุ่งยาก!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
                  <div className="p-3 rounded-2xl bg-gray-50 text-center space-y-1 border border-gray-100">
                    <span className="text-lg block">💵</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">วงเงินเริ่มต้น</span>
                    <span className="text-xs font-extrabold text-blue-600 block leading-tight">100k - 1,000,000 บ.</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50 text-center space-y-1 border border-gray-100">
                    <span className="text-lg block">📉</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ดอกเบี้ยต่ำสุดๆ</span>
                    <span className="text-xs font-extrabold text-emerald-600 block leading-tight">เพียง 2% ต่อปี!</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50 text-center space-y-1 border border-gray-100">
                    <span className="text-lg block">⏱️</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ผ่อนชำระสบาย</span>
                    <span className="text-xs font-extrabold text-amber-600 block leading-tight">นานสูงสุด 24 เดือน</span>
                  </div>
                </div>
              </div>

              {/* Conditions Checklist Section */}
              <div className="bg-amber-50/60 rounded-3xl p-4 border border-amber-100 space-y-2.5">
                <h4 className="text-xs font-black text-amber-800 flex items-center gap-1.5 leading-tight">
                  📌 เงื่อนไขง่ายๆ เพียงแค่ 3 ข้อ:
                </h4>
                <ul className="text-xs font-semibold text-gray-700 space-y-2 pl-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-extrabold shrink-0">1.</span>
                    <span>เป็นบัญชีร้านค้าเปิดมาแล้วขั้นต่ำ 1 เดือน</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-extrabold shrink-0">2.</span>
                    <span>มียอดขายประวัติสะสมขั้นต่ำเพียง 5,000 บาท เท่านั้น</span>
                  </li>
                  <li className="flex items-start gap-2 font-bold text-gray-900">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500 font-black shrink-0">3.</span>
                    <span className="flex items-center gap-1">
                      พิเศษหลักสิทธิ์! <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-tight">ไม่ตรวจเครดิตบูโรผ่านธนาคาร ❌ 🚫</span>
                    </span>
                  </li>
                </ul>
              </div>

              {/* Bottom call to action */}
              <div className="text-center space-y-3 pt-1 border-t border-gray-100">
                <p className="text-xs font-bold text-red-600 animate-pulse">
                  👉 สมัครด่วนวันนี้ เพื่อขยายธุรกิจของคุณให้ก้าวไปอีกขั้น!
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert('ระบบได้รับข้อมูลคำขอสมัครวงเงินสินเชื่อของท่านเรียบร้อยแล้วค่ะ! เจ้าหน้าที่ฝ่ายประเมินความมั่นคงและพิจารณาประวัติร้านค้าจะติดต่อกลับมาทางเบอร์โทรศัพท์ของท่านโดยเร็วที่สุดค่ะ 🙏✨');
                      setShowLoanModal(false);
                    }}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-black text-white shadow-md hover:opacity-95 transition-all text-center cursor-pointer"
                    style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
                  >
                    🚀 ยืนยันกดสมัครรับสิทธิ์สินเชื่อตอนนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLoanModal(false)}
                    className="px-5 py-3.5 rounded-2xl text-xs font-black text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all text-center cursor-pointer border border-gray-200"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 8. ADMIN ADD CATEGORY POPUP MODAL */}
      {showAddCategoryModal && (
        <div id="admin-add-category-modal" className="fixed inset-0 z-50 bg-black/60 overflow-y-auto backdrop-blur-sm py-10 px-4 flex justify-center items-start">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-50 p-6 animate-slide-up">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 font-display flex items-center gap-1.5">
                ➕ เพิ่มหมวดหมู่สินค้าใหม่
              </h3>
              <button 
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 font-display">ชื่อหมวดหมู่สินค้า (เช่น ของเล่น, เครื่องสำอาง)</label>
                <input
                  type="text"
                  required
                  placeholder="พิมพ์ชื่อหมวดหมู่ที่ต้องการ..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none focus:border-red-500"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 font-display">เลือกสัญลักษณ์ไอคอน / อีโมจิ (Emoji Icon)</label>
                <div className="grid grid-cols-6 gap-2">
                  {['🛍️', '👕', '🎒', '🧢', '🥤', '💄', '🧸', '👟', '⌚', '🍫', '📦', '🏷️'].map((emoji) => {
                    const isSelected = newCategoryIcon === emoji;
                    return (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setNewCategoryIcon(emoji)}
                        className={`text-xl p-2 rounded-xl border text-center transition-all ${
                          isSelected 
                            ? 'bg-red-50 border-red-400' 
                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <span className="text-[10px] text-gray-400 font-semibold block">หรือพิมพ์ใส่อีโมจิที่กำหนดเอง:</span>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="ป้อนอีโมจิเอง..."
                    className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl py-1.5 px-3 text-xs font-bold focus:outline-none focus:border-red-500"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition-all text-center cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeGradientEnd} 100%)` }}
                >
                  🚀 บันทึกและสร้างหมวดหมู่ใหม่
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all text-center cursor-pointer border border-gray-200"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. ADMIN MANAGE CATEGORIES POPUP MODAL */}
      {showManageCategoriesModal && (
        <div id="admin-manage-categories-modal" className="fixed inset-0 z-50 bg-black/60 overflow-y-auto backdrop-blur-sm py-10 px-4 flex justify-center items-start">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-50 p-6 animate-slide-up">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900 font-display flex items-center gap-1.5">
                ⚙️ จัดการหมวดหมู่ประเภทสินค้าทั้งหมด
              </h3>
              <button 
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setEditingCategoryKey(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[10px] text-gray-500 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200 block mb-4 animate-pulse">
              💡 คุณสามารถแก้ไขชื่อและอีโมจิ หรือลบหมวดหมู่สินค้าออนไลน์ทั้งหมดได้ที่นี่ค่ะ การเปลี่ยนแปลงจะมีผลต่อการค้นหาและตัวกรองสินค้าในทันทีค่ะ
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {dynamicCategories.filter(cat => cat.key !== 'ALL').length === 0 ? (
                <div className="text-center py-6 text-xs font-bold text-gray-400">
                  ไม่มีหมวดหมู่สินค้าในขณะนี้ค่ะ
                </div>
              ) : (
                dynamicCategories.filter(cat => cat.key !== 'ALL').map((cat) => {
                  const isEditing = editingCategoryKey === cat.key;
                  return (
                    <div 
                      key={cat.key} 
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                        isEditing 
                          ? 'bg-amber-50/50 border-amber-200' 
                          : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="อีโมจิ..."
                              className="w-16 bg-white border border-gray-250 rounded-xl py-1.5 px-2 text-center text-sm font-bold focus:outline-none focus:border-red-500"
                              value={editingCategoryIcon}
                              onChange={(e) => setEditingCategoryIcon(e.target.value)}
                            />
                            <input
                              type="text"
                              required
                              placeholder="ชื่อหมวดหมู่..."
                              className="flex-1 bg-white border border-gray-250 rounded-xl py-1.5 px-3 text-xs font-bold focus:outline-none focus:border-red-500"
                              value={editingCategoryLabel}
                              onChange={(e) => setEditingCategoryLabel(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(cat.key, editingCategoryLabel, editingCategoryIcon)}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryKey(null)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-600 text-[10px] font-black rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icon}</span>
                            <div>
                              <span className="text-xs font-black text-gray-800 block leading-tight">{cat.label}</span>
                              <span className="text-[9px] font-mono font-bold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded uppercase leading-none mt-0.5 inline-block">{cat.key}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryKey(cat.key);
                                setEditingCategoryLabel(cat.label);
                                setEditingCategoryIcon(cat.icon);
                              }}
                              className="px-2.5 py-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-150 rounded-xl transition-colors cursor-pointer"
                            >
                              แก้ไขชื่อ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.key)}
                              className="px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-150 rounded-xl transition-colors cursor-pointer"
                            >
                              ลบออก
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-gray-150 pt-4 mt-4 text-right">
              <button
                type="button"
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setEditingCategoryKey(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all border border-gray-200 cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
