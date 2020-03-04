// Агент для загрузки профессий из MS Excel
// Данные для считывания в файле должны быть расположены, например, в следующием порядке:
// ----------столбец 1 ---------- столбец2 ----------- столбец3---------------
// строка1 	Уровень1.Название1	Уровень2.Название21	Уровень3.Название31
// строка2   										Уровень3.Название32
// строка3	Уровень1.Название2  Уровень2.Название22
// строка4						Уровень2.Название23
// ----------------------------------------------------------------------------
// Информация из файла загружается в справочник специальности (professions).

// Если у стандартных элементов (у которых: <is_std>1</is_std>) есть пользовательские дочерние элементы, то
// пользовательские элементы сохраняются, и сохраняются все вышестоящие стандартные элементы.

// Если название уже существующего в базе иерархического элемента совпадает с названием загружаемого, то:
// программа НЕ создает новый элемент, импортирует только его дочерние элементы (если их назания не совпадают с уже имеющимися). 
 
// Агент удаляет из справочника специальностей все стандартные элементы (у которых: <is_std>1</is_std>) , у
// которых нет дочерних пользовательских элементов.

// Программа (Агент) запрашивает пользователя:
// Какой файл с иерархической структурой будет загружаен (выбор файла).



function UniPorfessionsHierImport()
{
	lib_base.check_desktop_client();

	cL = new Array(); //строка из EXCEL-файла
	aL = new Array(); //цепочка объектов из справочника профессий 
	rowLength = 0; // длинна строки из EXCEL-файла
	smallArray = new Array(); //маленкий массив профессий для загрузки элементов в базу
	elemID = 1; //id для нового элемента
	isInBase = false; //Новой профессии в старой базе не обнаружено
	isParentOpen = false; //Родительский элемент для вновь создаваемого элемента еще не открыт
	coincidence = 0; //Количество совпадений между плотной строкой из EXCEL-файла и цепочкой профессий из базы
	rowCurrentNumber = 0; //Количество непустых ячеек в строке из EXCEL-файла
	deletedArray = new Array(); // массив удаленных стандартных профессий
	
	//загрузка файла=========================== 
	LogEvent('', 'Start downloading professions from file.'); //Начало загрузки профессий из файла.
	fileUrl = ActiveScreen.AskFileOpen();
	if ( fileUrl == '' ) //проверяем наличие url  файла для загрузки
		throw UserError( UiText.errors.unable_to_open_file );
	LogEvent('', 'Check for file import - passed. fileUrl = ' + fileUrl); //Проверка на наличие файла для импорта - пройдена.
	
	srcDoc = OpenDoc( fileUrl, 'format=excel' );
	LogEvent('', 'Open a file to import.'); // Файл для импорта открыт
	//загрузка профессий ПЕРВИЧНАЯ =========================================
	array = ArraySort( professions, 'name', '+'); //массив профессий
	//LogEvent('', 'Массив профессий загружен из базы данных E-Staff - ПЕРВОНАЧАЛЬНЫЙ.');
	//==========================================
	
	arrayFlags = new Array();
	for (a=0; a<array.length; a++) //обходим массив профессий
	{
		arrayFlags[a] = 0;
		if (array[a].is_std == false)
		{
			arrayFlags[a] = 1; //данная профессия - пользовательская, не удалять!
		}
	}
	
	var c1=0; var c2=1;
	while(c1 != c2)
	{
		c1 = 0; for (a=0; a<arrayFlags.length; a++) { if (arrayFlags[a] == 1) {c1++;} } //подсчет количества "защищенных" профессий
		for (a=0; a<array.length; a++) //обходим массив профессий
		{
			if ((arrayFlags[a] == 1)&& 	//данная профессия - пользовательская, не удалять!
				(array[a].parent_id.HasValue)) 		 //если есть вышестоящая профессия - ее тоже не удалять!
			{
				for (b=0; b<array.length; b++) //обходим массив профессий
				{
					if (array[b].id == array[a].parent_id)
					{
						arrayFlags[b] = 1; //данная профессия - вышестоящяя для пользовательской, не удалять!
					}
				}	
			}
		}
		c2 = 0; for (a=0; a<arrayFlags.length; a++) { if (arrayFlags[a] == 1) {c2++;} } //подсчет количества "защищенных" профессий
	}
	
	for  (a=0; a<arrayFlags.length; a++) //удаление "меченых нулем" профессий
	{
		if (arrayFlags[a] == 0)
		{
			professionForDeleteUrl = ObjectDocUrl('data','profession', array[a].id );
			DeleteDoc(professionForDeleteUrl);
		}
	}
	
	//загрузка профессий ПОВТОРНАЯ =========================================
	array = ArraySort( professions, 'name', '+'); //массив профессий
	//LogEvent('', 'Массив профессий загружен из базы данных E-Staff - ПОВТОРНО');
	//==========================================
	
	//перебираем все строки в открытом EXCEL-файле, вычисляем максимальную длинну строки
	for ( row in srcDoc.TopElem[0] )  { if (rowLength < ArrayCount(row)) { rowLength = ArrayCount(row); } }
	LogEvent('', 'Find the line EXCEL maximum length of ' + rowLength); //Найдена строка EXCEL максимальной длинны, равной
	
	for ( i = 0; i<=(rowLength-1); i++)  { cL[i]=''; aL[i]=0; }//Обнуляем элементы массивов
	for ( row in srcDoc.TopElem[0] ) //Введение профессий первого уровня иерерахии: перебираем все строки в открытом EXCEL-файле================
	{
		rowCurrentNumber = 0;
		for ( i = 0; i<=(rowLength-1); i++) //формируем сплошную строку на основании данных EXCEL-файла
		{
			if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
			if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
			if  (row[i] != '') {rowCurrentNumber++;}
		}
		
		if ((rowCurrentNumber>0)&&(cL[0] != '')&&(row[0] != '' )) //если текущая строка EXCEL-файла не пустая
		{	
			isInBase = false;
			for ( profession in array ) //обходим массив профессий, выгруженных из базы данных E-Staff
			{
				if (( profession.parent_id.HasValue == false)&&(profession.name == cL[0])) { isInBase = true; }
			} 
		
			if (isInBase == false) //если профессии из строки EXCEL-файла в базе не найдено - создаем профессию первого уровня иерархии
			{
				elemID = lib_voc.obtain_next_voc_elem_id( professions );
				subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
			//	elemID = elemID + 1;
				subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
				subDoc.TopElem.name =  row[0];
				smallArray.push(subDoc.TopElem); //добавили профессию в маленький массив
				subDoc.Save();
			}
		}	
	}// все строки в открытом EXCEL-файле перебрали
	
	for (newProfession in smallArray) { LogEvent('', 'New profession Level 1: ' + newProfession.name); } //Новая специальность 1 уровня:
	if (smallArray.length > 0)
	{
		array = ArrayUnion(array, smallArray); //Объединяем массивы
		salo = smallArray.length;
		smallArray.splice( 0, salo ); //Очищаем маленький массив
		LogEvent('', 'Completed cycle 1. The added professions Level 1:' + salo); // Завершен 1 цикл. Количество добавленных специальностей 1 уровня: 
	}
	else
	{
		LogEvent('', 'Completed cycle 1. The added professions Level 1: 0 ');
	}
	//LogEvent('', 'Длинна массива (smallArray.length) после очистки: ' + smallArray.length);
	//===============================================================================================================================
	
	for ( w = 1; w<=(rowLength-1); w++) // w - номер столбца в EXCEL-файле(нумерация начинается с нуля).=====================================
	{									 // Введение профессий остальных (кроме первого) уровней иерархии
		w1 = w + 1;
		LogEvent('', 'Начали цикл  w = ' + w);
		for ( i = 0; i<=(rowLength-1); i++)  { cL[i]=''; aL[i]=0; }//Обнуляем элементы массивов
		//LogEvent('', 'Провели обнуление массивов cL[i] и aL[i]');
		for ( row in srcDoc.TopElem[0] ) //перебираем все строки в открытом excel========================================================
		{
			//LogEvent('', 'Формируем строку cL[0]..cL[' + (rowLength-1) + ']');
			rowCurrentNumber = 0;
			for ( i = 0; i<=(rowLength-1); i++) //формируем текущую строку
			{
				if ((row[i] != '')&&(cL[i]==''))  { cL[i]=row[i]; }
				if ((row[i] != '')&&(cL[i] !='')) { cL[i]=row[i]; }
				if  (row[i] != '') {rowCurrentNumber++;}
				//LogEvent('', 'cL[' + i + ']= '+ cL[i]);
			}
			if ((rowCurrentNumber>0)&&(cL[w] != '')&&(row[w] != '' )) //если текущая строка EXCEL-файла не пустая И рассматриваемый элемент строки не пустой
			{	
			//	LogEvent('', ' текущая строка cL[0] = ' + cL[0] + ' cL[1] = ' + cL[1]);
				
				isInBase = false;
				isParentOpen = false;
				
				for ( profession in array ) //обходим массив профессий, выгруженных из базы данных E-Staff
				{		
					//LogEvent('', 'Длина цепочки (w + 1) = ' + w1 );				
					//LogEvent('', 'строим цепочку aL[w], aL[w-1]...aL[0] из текущей профессии и вышестоящих, но не всех, а чтобы была цепчка длинной w+1');
					for (x = w; x>=0; x = x - 1) 	//строим цепочку aL[w], aL[w-1]...aL[0] из текущей профессии и вышестоящих, но не всех, а чтобы была цепчка длинной w+1
					{						//т.е. такой же длинны, как исследуемая часть сторки EXCEL-файла	
						if (x == w) {aL[x] = profession;}
						
						if (x < w)
						{
							if (aL[x+1] != 0)
							{
								if (aL[x+1].parent_id.HasValue == true)
								{
									//	LogEvent('', 'aL[x+1].id = ' + aL[x+1].id + ' aL[x+1].parent_id = ' + aL[x+1].parent_id);
									aL[x] = OpenDoc(ObjectDocUrl('data','profession', aL[x+1].parent_id)).TopElem;
								}
								else
								{
									aL[x] = 0;
								}
							}
							else
							{
								aL[x] = 0;
							}
						}
						//LogEvent('', 'aL[' + x + ']= ' + aL[x]); //  0,  1
					} //======построили цепочку из текущей профессии и вышестоящих=================================
							
					//LogEvent('', 'Сравниваем цепочку из текущей профессии и вышестоящих с текущей строкой');
					coincidenceAll = 0;//=============================================================================
					coincidenceShort = 0;
					for (y = w; y>=0; y= (y - 1)) //Сравниваем цепочку из текущей профессии и вышестоящих с текущей строкой 
					{
					//	LogEvent('', 'aL[' + y + ']= ' + aL[y]);
							
						if (aL[y] != 0) 
						{ 
							//LogEvent('', 'y = ' + y + ' aL[y].name = ' + aL[y].name + ' cL[y] = ' + cL[y] );
							if (aL[y].name == cL[y]) {coincidenceAll++;} 
						}
							
						if ((aL[y] !=0) && (y>0))
						{
							if (aL[y].name == cL[y-1]) {coincidenceShort++;}
						}
					}
					//	LogEvent('', 'coincidenceAll = ' + coincidenceAll +  'coincidenceShort = ' + coincidenceShort);

						
					if (coincidenceAll == (w+1) ) //если совпали все
					{
					//	LogEvent('', 'Выполнено - 1 - совпали все');
						if (aL[0].parent_id.HasValue == false) //и вехний конец цепочки - это верхний уровень (без родителя)
						{
							isInBase = true; //тогда - точно такая профессия уже есть в массиве
						}
					}
						
					if (coincidenceShort == w ) //если совпли все, кроме одного - самого верхнего (aL[0])
					{
					//	LogEvent('', ' Выполнено - 2 - совпли все, кроме одного - самого верхнего (aL[0])');
						if (aL[1].parent_id.HasValue == false)
						{
							parent = aL[w];
							isParentOpen = true;
						}
					}//=======================================================================================================
				} // обошли массив профессий из базы данных ==========================
					
				if ((isInBase == false)&&(isParentOpen == true)) //пополнение маленького массива профессий 
				{
					elemID = lib_voc.obtain_next_voc_elem_id( professions );
					subDoc = DefaultDb.OpenNewObjectDoc( 'profession', elemID );
					//	elemID = elemID + 1;
					subDoc.TopElem.order_index = lib_voc.obtain_next_voc_elem_order_index( professions );
					subDoc.TopElem.name =  row[w];
					subDoc.TopElem.parent_id = parent.id
					smallArray.push(subDoc.TopElem); //добавили профессию в маленький массив
					subDoc.Save();
				}		
			}	//к.ц. если теущая строка EXCEL-файле не пустая
		} //перебрали все сторки в открытом EXCEL-файле =================
		
		for ( newProfession in smallArray )
		{ 
			LogEvent('', 'New profession ' + w1 + ' Level: ' + newProfession.name);
		}
		
		if ( smallArray.length > 0 )
		{
			array = ArrayUnion( array, smallArray ); //Объединяем массивы
			salo = smallArray.length;
			smallArray.splice( 0, salo ); //Очищаем маленький массив
			LogEvent('', 'Completed ' + w1 + ' cycle. The added professions ' + w1 + 'Level: ' + salo);
		}
		else
		{
			LogEvent('', 'Completed ' + w1 + ' cycle. The added professions ' + w1 + 'Level: 0');
		}
	}//завершили цикл по столбцу	
}
