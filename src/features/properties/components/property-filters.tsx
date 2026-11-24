import Link from "next/link";
import type { PropertyFilters } from "@/features/properties/types/property";

type PropertyFiltersProps = {
  filters: PropertyFilters;
};

export function PropertyFiltersForm({ filters }: PropertyFiltersProps) {
  return (
    <form action="/propiedades" className="property-filters" method="get">
      <div className="property-filters__field property-filters__field--search">
        <label htmlFor="property-query">Ubicación o palabra clave</label>
        <input
          autoComplete="off"
          id="property-query"
          name="q"
          placeholder="Ciudad, colonia o característica"
          type="search"
          defaultValue={filters.query}
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="property-type">Tipo de propiedad</label>
        <select defaultValue={filters.type} id="property-type" name="type">
          <option value="">Todos los tipos</option>
          <option value="Casa">Casa</option>
          <option value="Departamento">Departamento</option>
          <option value="Terreno">Terreno</option>
          <option value="Casa de campo">Casa de campo</option>
        </select>
      </div>

      <div className="property-filters__field">
        <label htmlFor="property-min-price">Precio mínimo</label>
        <input
          defaultValue={filters.minPrice}
          id="property-min-price"
          inputMode="numeric"
          min="0"
          name="minPrice"
          placeholder="Sin mínimo"
          step="100000"
          type="number"
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="property-max-price">Precio máximo</label>
        <input
          defaultValue={filters.maxPrice}
          id="property-max-price"
          inputMode="numeric"
          min="0"
          name="maxPrice"
          placeholder="Sin máximo"
          step="100000"
          type="number"
        />
      </div>

      <div className="property-filters__field property-filters__field--compact">
        <label htmlFor="property-bedrooms">Recámaras</label>
        <select defaultValue={filters.bedrooms ?? ""} id="property-bedrooms" name="bedrooms">
          <option value="">Cualquiera</option>
          <option value="1">1 o más</option>
          <option value="2">2 o más</option>
          <option value="3">3 o más</option>
          <option value="4">4 o más</option>
        </select>
      </div>

      <div className="property-filters__field property-filters__field--compact">
        <label htmlFor="property-bathrooms">Baños</label>
        <select defaultValue={filters.bathrooms ?? ""} id="property-bathrooms" name="bathrooms">
          <option value="">Cualquiera</option>
          <option value="1">1 o más</option>
          <option value="2">2 o más</option>
          <option value="3">3 o más</option>
          <option value="4">4 o más</option>
        </select>
      </div>

      <div className="property-filters__field property-filters__field--compact">
        <label htmlFor="property-min-area">Superficie mínima</label>
        <input
          defaultValue={filters.minArea}
          id="property-min-area"
          inputMode="numeric"
          min="0"
          name="minArea"
          placeholder="m²"
          type="number"
        />
      </div>

      <div className="property-filters__field property-filters__field--compact">
        <label htmlFor="property-status">Estado</label>
        <select defaultValue={filters.status} id="property-status" name="status">
          <option value="">Todos</option>
          <option value="available">Disponible</option>
          <option value="in_deal">En trato</option>
          <option value="sold">Vendida</option>
        </select>
      </div>

      <div className="property-filters__field property-filters__field--compact">
        <label htmlFor="property-visibility">Visibilidad</label>
        <select defaultValue={filters.visibility} id="property-visibility" name="visibility">
          <option value="">Todas las públicas</option>
          <option value="public">Público general</option>
          <option value="both">Público y Premium</option>
        </select>
      </div>

      <div className="property-filters__field property-filters__field--sort">
        <label htmlFor="property-sort">Ordenar por</label>
        <select defaultValue={filters.sort} id="property-sort" name="sort">
          <option value="featured">Relevancia</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
        </select>
      </div>

      <div className="property-filters__actions">
        <Link className="property-filters__reset" href="/propiedades">
          Limpiar filtros
        </Link>
        <button className="button button--primary button--medium" type="submit">
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}
