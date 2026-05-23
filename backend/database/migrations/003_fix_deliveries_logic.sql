-- 003_fix_deliveries_logic.sql
-- Migration pour la correction de la logique des livraisons
-- Objectif : Éviter la création de ventes avant validation finale de la livraison
-- Compatible SQLite et MySQL

-- 1. Ajouter une colonne pour stocker les données de la vente en attente
-- (panier, remise, etc.) dans la livraison
-- NOTE: sale_id reste dans la table mais n'est plus NOT NULL.
-- Pour SQLite, on ne peut pas modifier la contrainte NOT NULL,
-- mais le code applicatif gère sale_id = NULL correctement.
ALTER TABLE deliveries ADD COLUMN pending_sale_data TEXT;

-- 2. Ajouter une colonne description aux mouvements de stock
-- pour justifier les réservations de stock liées aux livraisons
ALTER TABLE stock_movements ADD COLUMN description VARCHAR(255);
