<?php
class Audentio_UIX_Template_Helper_CanvasNavigation
{
    public static function canvasNavigation()
    {
        $params = Audentio_UIX_Listener_CodeEvent::$_containerParamsPublic;
        $params['offCanvasNav'] = 1;

        foreach ($params['extraTabs'] as $position=>&$extraTabs) {
            foreach ($extraTabs as &$extraTab) {
                if (isset($extraTab['linksTemplate'])) {
                    $linksTemplate = new XenForo_Template_Public($extraTab['linksTemplate'], $extraTab);
                    $extraTab['linksTemplate'] = $linksTemplate->render();
                }
            }
        }

        $template = new XenForo_Template_Public('navigation', $params);

        return $template->render();
    }
}