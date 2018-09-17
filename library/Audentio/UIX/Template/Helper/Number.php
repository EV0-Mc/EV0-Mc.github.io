<?php

class Audentio_UIX_Template_Helper_Number
{
    public static function superNumber($amount)
    {
        $suffix = false;
        if ($amount > 1000000000) {
            $suffix = 'B';
            $amount = $amount / 1000000000;
        } elseif ($amount > 1000000) {
            $suffix = 'M';
            $amount = $amount / 1000000;
        } elseif ($amount > 1000) {
            $suffix = 'K';
            $amount = $amount / 1000;
        }
        $numParts = explode('.', $amount);
        if (strlen($numParts[0]) >= 3) {
            $decimalPoints = 0;
        } elseif (strlen($numParts[0]) == 2) {
            $decimalPoints = 1;
        } else {
            $decimalPoints = 2;
        }
        if ($suffix) {
            $suffix = '<span>'.$suffix.'</span>';
        }

        return round($amount, $decimalPoints).$suffix;
    }
}
