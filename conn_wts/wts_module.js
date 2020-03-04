function OnModuleStart()
{
	if ( LdsIsClient )
	{
		register_global_settings_sections();
	}
}


function register_global_settings_sections()
{
	doc = FetchDoc( '//base1/base1_view_global_settings.xml' );

	section = doc.TopElem.sections.AddChild();
	section.name = UiText.titles.wts;
	section.holder = 'wts_global_settings';
	section.screen_form = '//conn_wts/wts_global_settings.xms';
}