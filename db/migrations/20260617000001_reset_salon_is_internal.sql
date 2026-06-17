-- Revert: previous migration incorrectly set all salons to is_internal=1
UPDATE `salons` SET `is_internal` = 0;
