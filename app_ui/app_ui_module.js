function OnModuleInit()
{
	//if ( ! System.IsWebClient )
		//RegisterCodeLibrary('//app_ui/AppUi.bs');

	if ( ! System.IsWebClient )
		RegisterCodeLibrary('//app_ui/AppUiSvg.bs');
}


