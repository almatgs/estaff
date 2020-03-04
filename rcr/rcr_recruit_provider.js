function on_ui_save()
{
	if ( this.std_provider_id == 'wts' && this.access_token.HasValue )
	{
		wts_global_settings.access_token = this.access_token;
		wts_global_settings.Doc.Save();
	}

	if ( features.testing )
		ObtainTestingSystem();
}


function ObtainTestingSystem()
{
	testingSystem = ArrayOptFindByKey( testing_systems, this.id );
	if ( testingSystem != undefined )
		return testingSystem;

	testingSystemDoc = DefaultDb.OpenNewObjectDoc( 'testing_system', this.id );
	testingSystem = testingSystemDoc.TopElem;
	testingSystem.name = this.name;
	testingSystem.recruit_provider_id = this.id;
	testingSystem.is_active = this.is_active;
	testingSystemDoc.Save();
	return testingSystem;
}