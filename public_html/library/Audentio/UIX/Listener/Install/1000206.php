<?php
class Audentio_UIX_Listener_Install_1000206
{
	protected static $_queries = array(
		"ALTER TABLE `xf_user_option` CHANGE `uix_sidebar` `uix_sidebar` INT(10) UNSIGNED NOT NULL DEFAULT '0';",
	);

	public static function run()
	{
		$db = XenForo_Application::get('db');
		foreach (self::$_queries as $query)
		{
			try
			{
				$db->query($query);
			}
			catch (Exception $e) {}
		}
	}
}