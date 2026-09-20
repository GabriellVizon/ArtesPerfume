BEGIN;

ALTER TABLE manual_products
    ADD COLUMN IF NOT EXISTS volume_ml NUMERIC(8,2)
    CHECK (volume_ml IS NULL OR (volume_ml > 0 AND volume_ml <= 10000));

ALTER TABLE product_overrides
    ADD COLUMN IF NOT EXISTS volume_ml NUMERIC(8,2)
    CHECK (volume_ml IS NULL OR (volume_ml > 0 AND volume_ml <= 10000));

COMMIT;
