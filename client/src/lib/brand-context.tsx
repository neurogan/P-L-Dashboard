/**
 * Brand Context — provides the currently selected brandId to all components.
 * The brand selector in the header sets this, and all API hooks read from it.
 */
import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

export interface Brand {
  id: number;
  brandKey: string;
  brandName: string;
  platforms: string[];
  isActive: boolean;
}

interface BrandContextType {
  brandId: number;
  setBrandId: (id: number) => void;
  brands: Brand[];
  currentBrand: Brand | undefined;
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType>({
  brandId: 1,
  setBrandId: () => {},
  brands: [],
  currentBrand: undefined,
  isLoading: true,
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brandId, setBrandId] = useState(1);

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/brands");
      return res.json();
    },
    staleTime: 300000, // 5 minutes — brands rarely change
  });

  const currentBrand = brands.find((b) => b.id === brandId);

  // If the selected brandId doesn't exist in the loaded brands, default to first
  useEffect(() => {
    if (brands.length > 0 && !brands.find((b) => b.id === brandId)) {
      setBrandId(brands[0].id);
    }
  }, [brands, brandId]);

  return (
    <BrandContext.Provider value={{ brandId, setBrandId, brands, currentBrand, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
