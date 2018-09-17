<?php

class Audentio_UIX_Listener_Install_1001170 extends Audentio_UIX_Listener_Install_Abstract
{
    protected static $_queries = array(
        "ALTER TABLE `uix_node_layout` ADD `separator_type` VARCHAR(50) NOT NULL DEFAULT 'grid' AFTER `node_id`;",
        "ALTER TABLE `uix_node_layout` ADD `separator_max_width` INT(10) NOT NULL DEFAULT 0 AFTER `separator_type`;",
    );

    public function run()
    {
        $db = XenForo_Application::get('db');
        foreach (self::$_queries as $query) {
            self::query($query);
        }
    }
}
