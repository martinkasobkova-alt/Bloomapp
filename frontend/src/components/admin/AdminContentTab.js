import React from 'react';
import { ServiceTypesCard } from './content/ServiceTypesCard';
import { LocationsCard } from './content/LocationsCard';
import { ArticleCatsCard } from './content/ArticleCatsCard';
import { NewsCatsCard } from './content/NewsCatsCard';
import { SpecCatsCard } from './content/SpecCatsCard';
import { TextSettingsCard } from './content/TextSettingsCard';
import { MarkerColorsCard } from './content/MarkerColorsCard';
import { SectionSettingsCard } from './content/SectionSettingsCard';
import { FeaturedItemsCard } from './content/FeaturedItemsCard';

export function AdminContentTab({
  // Lists
  serviceTypes, locations, articleCats, specCats, newsCatsApi,
  // Text settings
  textSettings, editingTextKey, setEditingTextKey, editingTextValue, setEditingTextValue,
  // Marker colors
  markerColors, editingColors, setEditingColors, draftColors, setDraftColors,
  // Section settings
  sectionSettings, editingSections, setEditingSections, draftSections, setDraftSections,
  // Featured items
  featuredItems, specialists, news,
  // Service type edit state
  editingServiceType, setEditingServiceType,
  editingServiceTypeName, setEditingServiceTypeName,
  // Add/edit state
  newServiceType, setNewServiceType,
  newLocation, setNewLocation, newLocationCountry, setNewLocationCountry,
  editingLocation, setEditingLocation, editingLocationName, setEditingLocationName,
  editingLocationCountry, setEditingLocationCountry,
  newArticleCat, setNewArticleCat,
  newSpecCat, setNewSpecCat,
  editingSpecCat, setEditingSpecCat, editingSpecCatName, setEditingSpecCatName,
  newNewsCat, setNewNewsCat, editingNewsCat, setEditingNewsCat, editingNewsCatName, setEditingNewsCatName,
  // Handlers
  handleAddServiceType, handleSaveServiceType, handleDeleteServiceType,
  handleAddLocation, handleSaveLocation, handleDeleteLocation,
  handleAddArticleCat, handleDeleteArticleCat, handleUpdateArticleCatRoles,
  handleAddNewsCat, handleSaveNewsCat, handleDeleteNewsCat, handleUpdateNewsCatRoles,
  handleAddSpecCat, handleDeleteSpecCat, handleSaveSpecCat,
  handleSaveText,
  handleSaveMarkerColors,
  handleSaveSectionSettings, fetchSectionSettings,
  handleToggleFeatured, handleMoveFeatured, fetchFeaturedItems,
}) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <ServiceTypesCard
        serviceTypes={serviceTypes}
        newServiceType={newServiceType} setNewServiceType={setNewServiceType}
        editingServiceType={editingServiceType} setEditingServiceType={setEditingServiceType}
        editingServiceTypeName={editingServiceTypeName} setEditingServiceTypeName={setEditingServiceTypeName}
        handleAddServiceType={handleAddServiceType}
        handleSaveServiceType={handleSaveServiceType}
        handleDeleteServiceType={handleDeleteServiceType}
      />
      <LocationsCard
        locations={locations}
        newLocation={newLocation} setNewLocation={setNewLocation}
        newLocationCountry={newLocationCountry} setNewLocationCountry={setNewLocationCountry}
        editingLocation={editingLocation} setEditingLocation={setEditingLocation}
        editingLocationName={editingLocationName} setEditingLocationName={setEditingLocationName}
        editingLocationCountry={editingLocationCountry} setEditingLocationCountry={setEditingLocationCountry}
        handleAddLocation={handleAddLocation}
        handleSaveLocation={handleSaveLocation}
        handleDeleteLocation={handleDeleteLocation}
      />
      <ArticleCatsCard
        articleCatsApi={articleCats}
        newArticleCat={newArticleCat} setNewArticleCat={setNewArticleCat}
        handleAddArticleCat={handleAddArticleCat}
        handleDeleteArticleCat={handleDeleteArticleCat}
        handleUpdateArticleCatRoles={handleUpdateArticleCatRoles}
      />
      <NewsCatsCard
        newsCatsApi={newsCatsApi}
        newNewsCat={newNewsCat} setNewNewsCat={setNewNewsCat}
        editingNewsCat={editingNewsCat} setEditingNewsCat={setEditingNewsCat}
        editingNewsCatName={editingNewsCatName} setEditingNewsCatName={setEditingNewsCatName}
        handleAddNewsCat={handleAddNewsCat}
        handleSaveNewsCat={handleSaveNewsCat}
        handleDeleteNewsCat={handleDeleteNewsCat}
        handleUpdateNewsCatRoles={handleUpdateNewsCatRoles}
      />
      <SpecCatsCard
        specCats={specCats}
        newSpecCat={newSpecCat} setNewSpecCat={setNewSpecCat}
        editingSpecCat={editingSpecCat} setEditingSpecCat={setEditingSpecCat}
        editingSpecCatName={editingSpecCatName} setEditingSpecCatName={setEditingSpecCatName}
        handleAddSpecCat={handleAddSpecCat}
        handleDeleteSpecCat={handleDeleteSpecCat}
        handleSaveSpecCat={handleSaveSpecCat}
      />
      <TextSettingsCard
        textSettings={textSettings}
        editingTextKey={editingTextKey} setEditingTextKey={setEditingTextKey}
        editingTextValue={editingTextValue} setEditingTextValue={setEditingTextValue}
        handleSaveText={handleSaveText}
      />
      <MarkerColorsCard
        markerColors={markerColors}
        editingColors={editingColors} setEditingColors={setEditingColors}
        draftColors={draftColors} setDraftColors={setDraftColors}
        handleSaveMarkerColors={handleSaveMarkerColors}
      />
      <SectionSettingsCard
        sectionSettings={sectionSettings}
        editingSections={editingSections} setEditingSections={setEditingSections}
        draftSections={draftSections} setDraftSections={setDraftSections}
        handleSaveSectionSettings={handleSaveSectionSettings}
        fetchSectionSettings={fetchSectionSettings}
      />
      <FeaturedItemsCard
        featuredItems={featuredItems}
        specialists={specialists}
        news={news}
        handleToggleFeatured={handleToggleFeatured}
        handleMoveFeatured={handleMoveFeatured}
        fetchFeaturedItems={fetchFeaturedItems}
      />
    </div>
  );
}
