function RunAgentUpdateVacanciesWorkDaysNum()
{
	idArray = new Array;

	queryStr = 'for $elem in vacancies';
	queryStr += ' return $elem/Fields( "id","is_active","start_date","work_start_date" )';

	for ( vacancy in XQuery( queryStr ) )
	{
		if ( vacancy.is_active )
			continue;

		if ( vacancy.start_date == vacancy.work_start_date )
			continue;
		
		idArray.push( vacancy.id );
	}

	for ( vacancyID in idArray )
	{
		LogEvent( '', 'Vacancy to update work term: ' + StrHexInt( vacancyID ) );

		vacancyDoc = DefaultDb.OpenObjectDoc( 'vacancy', vacancyID );
		vacancy = vacancyDoc.TopElem;

		prevWorkDaysNum = RValue( vacancy.work_days_num );
		prevWorkWDaysNum = RValue( vacancy.work_wdays_num );
		
		lib_vacancy.UpdateVacancyWorkDaysNum( vacancy );

		if ( vacancy.work_days_num == prevWorkDaysNum && vacancy.work_wdays_num == prevWorkWDaysNum )
			continue;

		vacancyDoc.WriteDocInfo = false;
		vacancyDoc.RunActionOnBeforeSave = false;
		vacancyDoc.RunActionOnSave = false;
		vacancyDoc.Save();

		LogEvent( '', 'Done' );
	}

}

