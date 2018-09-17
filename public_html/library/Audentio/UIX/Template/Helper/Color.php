<?php
class Audentio_UIX_Template_Helper_Color
{
    public static function colorTweak($baseColor, $formula='', $returnType='rgba')
    {
        $color = \SyHolloway\MrColor\Color::load($baseColor);

        $commands = explode(',', $formula);
        foreach ($commands as $command) {
            $action = $command[0];
            $operator = $command[1];
            $amount = (float) substr($command, 2);
            if ($amount > 1) {
                $amount = $amount / 100;
            }

            switch ($action) {
                case 'h':
                    if ($operator == '+') {
                        $color->hue = $color->hue + $amount;
                    } elseif ($operator == '=') {
                        $color->hue = $amount;
                    } else  {
                        $color->hue = $color->hue - $amount;
                    }
                    break;
                case 's':
                    if ($operator == '+') {
                        $color->saturation = $color->saturation + $amount;
                    } elseif ($operator == '=') {
                        $color->saturation = $amount;
                    } else {
                        $color->saturation = $color->saturation - $amount;
                    }
                    break;
                case 'l':
                    if ($operator == '+') {
                        $color->lightness = $color->lightness + $amount;
                    } elseif ($operator == '=') {
                        $color->lightness = $amount;
                    } else  {
                        $color->lightness = $color->lightness - $amount;
                    }
                    break;
                case 'a':
                    if ($operator == '+') {
                        $color->alpha = $color->alpha + $amount;
                    } elseif ($operator == '=') {
                        $color->alpha = $amount;
                    } else  {
                        $color->alpha = $color->alpha - $amount;
                    }
                    break;
            }
        }
        if ($color->hue > 1) {
            $color->hue = 1;
        } elseif ($color->hue < 0) {
            $color->hue = 0;
        }
        if ($color->saturation > 1) {
            $color->saturation = 1;
        } elseif ($color->saturation < 0) {
            $color->saturation = 0;
        }
        if ($color->lightness > 1) {
            $color->lightness = 1;
        } elseif ($color->lightness < 0) {
            $color->lightness = 0;
        }
        if ($color->alpha > 1) {
            $color->alpha = 1;
        } elseif ($color->alpha < 0) {
            $color->alpha = 0;
        }

        if ($color->alpha != 1) {
            return 'rgba('.$color->red.','.$color->green.','.$color->blue.','.$color->alpha.')';
        } else {
            return 'rgb('.$color->red.','.$color->green.','.$color->blue.')';
        }
    }
}