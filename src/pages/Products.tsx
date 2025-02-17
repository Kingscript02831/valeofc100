
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, User } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { supabase } from "../integrations/supabase/client";
import type { ProductWithDistance } from "../types/products";
import { useQuery } from "@tanstack/react-query";
import { useSiteConfig } from "../hooks/useSiteConfig";

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState<{lat: number; lon: number} | null>(null);
  const { data: config } = useSiteConfig();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          toast({
            title: "Localização não disponível",
            description: "Ative a localização para ver produtos próximos",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", userLocation],
    queryFn: async () => {
      if (!userLocation) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as ProductWithDistance[];
      }

      const { data, error } = await supabase
        .rpc("search_products_by_location", {
          search_lat: userLocation.lat,
          search_lon: userLocation.lon,
          radius_in_meters: 5000
        });

      if (error) throw error;
      return data as ProductWithDistance[];
    },
    enabled: true,
  });

  const filteredProducts = products?.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pb-20 pt-20">
        <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-sm pb-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/user-products")}
              className="hover:scale-105 transition-transform text-foreground"
            >
              <User className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-card text-card-foreground"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                      });
                    }
                  );
                }
              }}
              className="hover:scale-105 transition-transform text-foreground"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-card">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts?.map((product) => (
              <Card 
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  background: config ? `linear-gradient(to bottom, ${config.navbar_color}, ${config.primary_color}40)` : undefined,
                  borderColor: config?.primary_color
                }}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={product.images[0] || "/placeholder.svg"}
                    alt={product.title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <CardContent className="p-4" style={{ color: config?.text_color }}>
                  <h3 className="font-semibold truncate mb-2">{product.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">
                      R$ {product.price.toFixed(2)}
                    </span>
                    {product.distance && (
                      <span className="text-sm opacity-75 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {(product.distance / 1000).toFixed(1)}km
                      </span>
                    )}
                  </div>
                  {product.location_name && (
                    <p className="text-sm opacity-75 truncate mt-1">
                      {product.location_name}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
