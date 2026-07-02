-- VOC-34: composite index for the content kanban query (filters
-- projectId/status, orders by position). Additive, no data change, safe on live data.
-- Rollback: DROP INDEX "ContentItem_projectId_status_position_idx";

-- CreateIndex
CREATE INDEX "ContentItem_projectId_status_position_idx" ON "ContentItem"("projectId", "status", "position");
